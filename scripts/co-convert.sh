#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# co-convert — Convert between Claude Code CLI and Cowork Plugin formats
#
# Part of the CO Template toolset.
# See: .claude/guides/conversion/ for documentation.
#
# Usage:
#   co-convert to-plugin [--name NAME] [--force] [--dry-run] [--no-refs]
#   co-convert to-cli    [--force] [--dry-run] [--no-refs]
#   co-convert diff
#   co-convert status
# ============================================================================

VERSION="1.0.0"

# Resolve project root (script lives in scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Directory paths
CLI_DIR="$PROJECT_ROOT/.claude"
CLI_COMMANDS="$CLI_DIR/commands"
CLI_AGENTS="$CLI_DIR/agents"
CLI_RULES="$CLI_DIR/rules"
PLUGIN_DIR="$PROJECT_ROOT/plugin"
PLUGIN_SKILLS="$PLUGIN_DIR/skills"
PLUGIN_AGENTS="$PLUGIN_DIR/agents"
PLUGIN_META="$PLUGIN_DIR/.claude-plugin"
PLUGIN_JSON="$PLUGIN_META/plugin.json"
PLUGIN_CLAUDE_MD="$PLUGIN_DIR/CLAUDE.md"
ROOT_CLAUDE_MD="$PROJECT_ROOT/CLAUDE.md"

# Colors (disabled if not a terminal)
if [[ -t 1 ]]; then
    RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
    BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'
else
    RED=''; GREEN=''; YELLOW=''; BLUE=''; BOLD=''; NC=''
fi

# Options
PLUGIN_NAME=""
DRY_RUN=false
FORCE=false
NO_REFS=false

# ============================================================================
# Logging
# ============================================================================

info()    { echo -e "${BLUE}>${NC} $*"; }
success() { echo -e "${GREEN}+${NC} $*"; }
warn()    { echo -e "${YELLOW}!${NC} $*"; }
error()   { echo -e "${RED}x${NC} $*" >&2; }
dry()     { echo -e "${YELLOW}[dry-run]${NC} $*"; }

# ============================================================================
# Usage
# ============================================================================

usage() {
    cat <<EOF
${BOLD}co-convert${NC} v$VERSION — Convert between Claude Code CLI and Cowork Plugin formats

${BOLD}Usage:${NC}
  co-convert to-plugin [options]    Convert .claude/ to plugin/
  co-convert to-cli    [options]    Convert plugin/ to .claude/
  co-convert diff                   Show differences between formats
  co-convert status                 Show what exists in each format

${BOLD}Options:${NC}
  -n, --name NAME    Plugin name (default: auto-detect from plugin.json or dir name)
  -f, --force        Overwrite existing files without prompting
  -d, --dry-run      Show what would be done without doing it
      --no-refs      Skip reference transformation (just copy files as-is)
  -h, --help         Show this help

${BOLD}What gets converted:${NC}
  Commands  .claude/commands/{name}.md      <-->  plugin/skills/{name}/SKILL.md
  Agents    .claude/agents/**/*.md          <-->  plugin/agents/**/*.md
  References  /command                      <-->  /plugin-name:command

${BOLD}What gets generated:${NC}
  to-plugin:  plugin/.claude-plugin/plugin.json (if missing)
              plugin/CLAUDE.md (Skills & Agents tables updated if exists)
  to-cli:     (prints reminder to update root CLAUDE.md manually)

${BOLD}Examples:${NC}
  co-convert to-plugin --name co-legal       Convert CLI to plugin named "co-legal"
  co-convert to-cli                          Convert plugin back to CLI format
  co-convert diff                            See what's out of sync
  co-convert to-plugin --dry-run             Preview changes without writing
EOF
}

# ============================================================================
# Argument parsing
# ============================================================================

parse_args() {
    local command_set=false

    while [[ $# -gt 0 ]]; do
        case "$1" in
            to-plugin|to-cli|diff|status)
                if $command_set; then
                    error "Only one command allowed"; exit 1
                fi
                COMMAND="$1"; command_set=true ;;
            -n|--name)
                shift; PLUGIN_NAME="${1:-}"
                [[ -z "$PLUGIN_NAME" ]] && { error "--name requires a value"; exit 1; } ;;
            -f|--force)   FORCE=true ;;
            -d|--dry-run) DRY_RUN=true ;;
            --no-refs)    NO_REFS=true ;;
            -h|--help)    usage; exit 0 ;;
            *)            error "Unknown option: $1"; usage; exit 1 ;;
        esac
        shift
    done

    if ! $command_set; then
        usage; exit 1
    fi
}

# ============================================================================
# Detection helpers
# ============================================================================

# Detect plugin name from plugin.json, --name flag, or directory name
detect_plugin_name() {
    # Flag takes priority
    if [[ -n "$PLUGIN_NAME" ]]; then
        return
    fi

    # Try plugin.json
    if [[ -f "$PLUGIN_JSON" ]]; then
        local json_name
        json_name=$(grep '"name"' "$PLUGIN_JSON" | head -1 | sed 's/.*"name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
        if [[ -n "$json_name" ]]; then
            PLUGIN_NAME="$json_name"
            return
        fi
    fi

    # Fall back to directory name
    PLUGIN_NAME="$(basename "$PROJECT_ROOT")"
    warn "No plugin name found. Using directory name: $PLUGIN_NAME"
}

# List command names from .claude/commands/
get_command_names() {
    local names=()
    if [[ -d "$CLI_COMMANDS" ]]; then
        for f in "$CLI_COMMANDS"/*.md; do
            [[ -f "$f" ]] && names+=("$(basename "$f" .md)")
        done
    fi
    echo "${names[@]}"
}

# List skill names from plugin/skills/
get_skill_names() {
    local names=()
    if [[ -d "$PLUGIN_SKILLS" ]]; then
        for d in "$PLUGIN_SKILLS"/*/; do
            [[ -d "$d" ]] && [[ -f "$d/SKILL.md" ]] && names+=("$(basename "$d")")
        done
    fi
    echo "${names[@]}"
}

# Get union of all known command/skill names
get_all_names() {
    local all=()
    local cmd_names skill_names
    read -ra cmd_names <<< "$(get_command_names)"
    read -ra skill_names <<< "$(get_skill_names)"
    all=("${cmd_names[@]}" "${skill_names[@]}")
    # Deduplicate
    printf '%s\n' "${all[@]}" | sort -u | tr '\n' ' '
}

# Extract a frontmatter field from a markdown file
get_field() {
    local file="$1" field="$2"
    local in_fm=false found=false value=""

    while IFS= read -r line; do
        if [[ "$line" == "---" ]]; then
            if $in_fm; then break; fi
            in_fm=true; continue
        fi
        $in_fm || continue

        if [[ "$line" =~ ^${field}:\ *(.*) ]]; then
            value="${BASH_REMATCH[1]}"
            if [[ "$value" == ">" || "$value" == ">-" ]]; then
                # Multiline: read continuation lines
                value=""
                while IFS= read -r line; do
                    if [[ "$line" =~ ^[a-zA-Z] ]]; then break; fi
                    [[ -z "$line" ]] && continue
                    local trimmed="${line#"${line%%[![:space:]]*}"}"
                    [[ -n "$value" ]] && value="$value "
                    value+="$trimmed"
                done
            fi
            found=true; break
        fi
    done < "$file"

    echo "$value"
}

# Map command/skill name to phase number
get_phase() {
    case "$1" in
        analyze)  echo "01" ;;
        plan)     echo "02" ;;
        execute)  echo "03" ;;
        review)   echo "04" ;;
        finalize) echo "05" ;;
        *)        echo "--" ;;
    esac
}

# ============================================================================
# Reference transformation
# ============================================================================

# Build a regex alternation pattern from command names
build_names_pattern() {
    local names=("$@")
    local pattern=""
    for name in "${names[@]}"; do
        [[ -z "$name" ]] && continue
        [[ -n "$pattern" ]] && pattern+="|"
        pattern+="$name"
    done
    echo "$pattern"
}

# Transform references in a file: /command <-> /plugin-name:command
# Direction: "to-plugin" or "to-cli"
transform_refs() {
    local file="$1" direction="$2" plugin_name="$3"
    shift 3
    local names=("$@")

    [[ ${#names[@]} -eq 0 ]] && return

    local pattern
    pattern=$(build_names_pattern "${names[@]}")
    [[ -z "$pattern" ]] && return

    if [[ "$direction" == "to-plugin" ]]; then
        # Two-step: first strip any existing prefix, then add the correct one
        # Step 1: /any-prefix:command -> /command
        perl -i -pe "s/\/[\w][\w-]*:($pattern)(?![a-z0-9_-])/\/\$1/g" "$file"
        # Step 2: /command -> /plugin-name:command (only bare references)
        perl -i -pe "s/(?<![:\w])\/($pattern)(?![a-z0-9_-])/\/${plugin_name}:\$1/g" "$file"
    elif [[ "$direction" == "to-cli" ]]; then
        # Strip all plugin prefixes: /any-prefix:command -> /command
        perl -i -pe "s/\/[\w][\w-]*:($pattern)(?![a-z0-9_-])/\/\$1/g" "$file"
    fi
}

# ============================================================================
# File operations
# ============================================================================

# Safely write a file (respects --dry-run and --force)
safe_write() {
    local target="$1" content="$2" desc="${3:-}"

    if $DRY_RUN; then
        dry "Would write: $target ${desc:+($desc)}"
        return
    fi

    if [[ -f "$target" ]] && ! $FORCE; then
        warn "Exists: $target (use --force to overwrite)"
        return
    fi

    mkdir -p "$(dirname "$target")"
    echo "$content" > "$target"
    success "Wrote: $target ${desc:+($desc)}"
}

# Safely copy a file (respects --dry-run and --force)
safe_copy() {
    local src="$1" dest="$2" desc="${3:-}"

    if $DRY_RUN; then
        dry "Would copy: $src -> $dest ${desc:+($desc)}"
        return
    fi

    if [[ -f "$dest" ]] && ! $FORCE; then
        # Check if content differs
        if diff -q "$src" "$dest" > /dev/null 2>&1; then
            info "Unchanged: $dest"
            return
        fi
        warn "Exists (different): $dest (use --force to overwrite)"
        return
    fi

    mkdir -p "$(dirname "$dest")"
    cp "$src" "$dest"
    success "Copied: $dest ${desc:+($desc)}"
}

# ============================================================================
# Conversion: Commands -> Skills
# ============================================================================

convert_commands_to_skills() {
    local plugin_name="$1"

    if [[ ! -d "$CLI_COMMANDS" ]]; then
        error "No commands directory found at $CLI_COMMANDS"
        return 1
    fi

    local names
    read -ra names <<< "$(get_command_names)"

    if [[ ${#names[@]} -eq 0 ]]; then
        warn "No commands found in $CLI_COMMANDS"
        return
    fi

    info "Converting ${#names[@]} commands to skills..."

    for name in "${names[@]}"; do
        local src="$CLI_COMMANDS/$name.md"
        local dest="$PLUGIN_SKILLS/$name/SKILL.md"

        if $DRY_RUN; then
            dry "Would convert: $src -> $dest"
            if ! $NO_REFS; then
                dry "Would transform references: /command -> /$plugin_name:command"
            fi
            continue
        fi

        if [[ -f "$dest" ]] && ! $FORCE; then
            if diff -q "$src" "$dest" > /dev/null 2>&1; then
                info "Unchanged: $dest"
                continue
            fi
            warn "Exists (different): $dest (use --force to overwrite)"
            continue
        fi

        mkdir -p "$(dirname "$dest")"
        cp "$src" "$dest"

        if ! $NO_REFS; then
            transform_refs "$dest" "to-plugin" "$plugin_name" "${names[@]}"
        fi

        success "Converted: $name.md -> skills/$name/SKILL.md"
    done
}

# ============================================================================
# Conversion: Skills -> Commands
# ============================================================================

convert_skills_to_commands() {
    local plugin_name="$1"

    if [[ ! -d "$PLUGIN_SKILLS" ]]; then
        error "No skills directory found at $PLUGIN_SKILLS"
        return 1
    fi

    local names
    read -ra names <<< "$(get_skill_names)"

    if [[ ${#names[@]} -eq 0 ]]; then
        warn "No skills found in $PLUGIN_SKILLS"
        return
    fi

    info "Converting ${#names[@]} skills to commands..."

    for name in "${names[@]}"; do
        local src="$PLUGIN_SKILLS/$name/SKILL.md"
        local dest="$CLI_COMMANDS/$name.md"

        if $DRY_RUN; then
            dry "Would convert: $src -> $dest"
            if ! $NO_REFS; then
                dry "Would transform references: /$plugin_name:command -> /command"
            fi
            continue
        fi

        if [[ -f "$dest" ]] && ! $FORCE; then
            if diff -q "$src" "$dest" > /dev/null 2>&1; then
                info "Unchanged: $dest"
                continue
            fi
            warn "Exists (different): $dest (use --force to overwrite)"
            continue
        fi

        mkdir -p "$(dirname "$dest")"
        cp "$src" "$dest"

        if ! $NO_REFS; then
            transform_refs "$dest" "to-cli" "$plugin_name" "${names[@]}"
        fi

        success "Converted: skills/$name/SKILL.md -> $name.md"
    done
}

# ============================================================================
# Agent sync
# ============================================================================

sync_agents() {
    local direction="$1"
    local src_dir dest_dir

    if [[ "$direction" == "to-plugin" ]]; then
        src_dir="$CLI_AGENTS"
        dest_dir="$PLUGIN_AGENTS"
    else
        src_dir="$PLUGIN_AGENTS"
        dest_dir="$CLI_AGENTS"
    fi

    if [[ ! -d "$src_dir" ]]; then
        warn "No agents directory found at $src_dir"
        return
    fi

    info "Syncing agents ($direction)..."

    # Find all .md files in source agents directory
    while IFS= read -r -d '' src_file; do
        local rel_path="${src_file#"$src_dir/"}"
        local dest_file="$dest_dir/$rel_path"
        safe_copy "$src_file" "$dest_file"
    done < <(find "$src_dir" -name "*.md" -print0)
}

# ============================================================================
# Plugin manifest generation
# ============================================================================

generate_plugin_json() {
    local plugin_name="$1"

    if [[ -f "$PLUGIN_JSON" ]] && ! $FORCE; then
        info "plugin.json already exists (use --force to regenerate)"
        return
    fi

    local content
    content=$(cat <<EOF
{
  "name": "$plugin_name",
  "version": "1.0.0",
  "description": "CO for [Your Domain] - Cognitive Orchestration plugin. Replace this with your domain description.",
  "author": {
    "name": "Your Name",
    "url": "https://your-url.com"
  },
  "homepage": "https://terrene.foundation/standards/co/",
  "repository": "https://github.com/your-org/your-co-repo",
  "license": "Apache-2.0",
  "keywords": ["cognitive-orchestration", "CO", "your-domain"]
}
EOF
)

    if $DRY_RUN; then
        dry "Would generate: $PLUGIN_JSON"
        return
    fi

    mkdir -p "$PLUGIN_META"
    echo "$content" > "$PLUGIN_JSON"
    success "Generated: $PLUGIN_JSON"
}

# ============================================================================
# Plugin CLAUDE.md generation
# ============================================================================

generate_plugin_claude_md() {
    local plugin_name="$1"

    # Build the Skills table
    local skills_table=""
    skills_table+="| Skill | Phase | Purpose |"$'\n'
    skills_table+="|-------|-------|---------|"

    local names
    read -ra names <<< "$(get_all_names)"

    # Sort names in a sensible order: start first, then by phase, then utility
    local ordered=()
    # Phase commands in order
    for n in start analyze plan execute review finalize; do
        for name in "${names[@]}"; do
            [[ "$name" == "$n" ]] && ordered+=("$name")
        done
    done
    # Utility commands
    for n in ws wrapup checkpoint; do
        for name in "${names[@]}"; do
            [[ "$name" == "$n" ]] && ordered+=("$name")
        done
    done
    # Any remaining custom commands
    for name in "${names[@]}"; do
        local found=false
        for o in "${ordered[@]}"; do
            [[ "$name" == "$o" ]] && found=true
        done
        $found || ordered+=("$name")
    done

    for name in "${ordered[@]}"; do
        [[ -z "$name" ]] && continue
        local desc="" src=""
        # Try to get description from command or skill file
        if [[ -f "$CLI_COMMANDS/$name.md" ]]; then
            src="$CLI_COMMANDS/$name.md"
        elif [[ -f "$PLUGIN_SKILLS/$name/SKILL.md" ]]; then
            src="$PLUGIN_SKILLS/$name/SKILL.md"
        fi
        if [[ -n "$src" ]]; then
            desc=$(get_field "$src" "description")
        fi
        local phase
        phase=$(get_phase "$name")
        skills_table+=$'\n'"| \`/$plugin_name:$name\` | $phase | $desc |"
    done

    # Build the Agents table
    local agents_table=""
    agents_table+="| Agent | Purpose |"$'\n'
    agents_table+="|-------|---------|"

    local agent_src="$CLI_AGENTS"
    [[ ! -d "$agent_src" ]] && agent_src="$PLUGIN_AGENTS"

    if [[ -d "$agent_src" ]]; then
        while IFS= read -r -d '' agent_file; do
            local agent_name agent_desc
            agent_name=$(get_field "$agent_file" "name")
            agent_desc=$(get_field "$agent_file" "description")
            [[ -z "$agent_name" ]] && agent_name="$(basename "$agent_file" .md)"
            agents_table+=$'\n'"| **$agent_name** | $agent_desc |"
        done < <(find "$agent_src" -name "*.md" -print0 | sort -z)
    fi

    # Extract Absolute Directives from root CLAUDE.md
    local directives=""
    if [[ -f "$ROOT_CLAUDE_MD" ]]; then
        directives=$(awk '
            /^## Absolute Directives/ { found=1; print; next }
            found && /^## / { exit }
            found { print }
        ' "$ROOT_CLAUDE_MD")
    fi

    # If no directives found, use a placeholder
    if [[ -z "$directives" ]]; then
        directives='## Absolute Directives

These override ALL other instructions.

1. **[Domain] Integrity First.** [Your most critical rule.]
2. **Human Judgment Stays Visible.** The AI assists. The human decides.
3. **[Quality Rule].** [Your domain'"'"'s accuracy standard.]'
    fi

    # Build the full plugin CLAUDE.md
    local content
    content=$(cat <<EOF
# CO Plugin -- [Your Domain]

> **New here?** Type \`/$plugin_name:start\` to begin.

This plugin implements CO (Cognitive Orchestration) for [your domain]. It provides structured human-AI collaboration with phased workflows, specialized agents, and quality guardrails.

$directives

## Skills

$skills_table

## Agents

$agents_table

## Customization

Replace \`$plugin_name\` with your domain name (e.g., \`co-legal\`, \`co-medical\`, \`co-marketing\`) in:
1. \`.claude-plugin/plugin.json\` (the \`name\` field)
2. All skill references in this file
3. Run \`co-convert to-plugin --name your-new-name --force\` to regenerate
EOF
)

    if $DRY_RUN; then
        dry "Would generate: $PLUGIN_CLAUDE_MD"
        return
    fi

    if [[ -f "$PLUGIN_CLAUDE_MD" ]] && ! $FORCE; then
        warn "plugin/CLAUDE.md already exists (use --force to regenerate)"
        return
    fi

    mkdir -p "$PLUGIN_DIR"
    echo "$content" > "$PLUGIN_CLAUDE_MD"
    success "Generated: $PLUGIN_CLAUDE_MD"
}

# ============================================================================
# Main commands
# ============================================================================

cmd_to_plugin() {
    detect_plugin_name

    echo ""
    echo -e "${BOLD}Converting CLI to Plugin format${NC}"
    echo -e "  Plugin name: ${GREEN}$PLUGIN_NAME${NC}"
    echo -e "  Source:      .claude/"
    echo -e "  Target:      plugin/"
    echo ""

    # 1. Convert commands -> skills
    convert_commands_to_skills "$PLUGIN_NAME"
    echo ""

    # 2. Sync agents
    sync_agents "to-plugin"
    echo ""

    # 3. Generate plugin.json
    generate_plugin_json "$PLUGIN_NAME"

    # 4. Generate plugin/CLAUDE.md
    generate_plugin_claude_md "$PLUGIN_NAME"

    echo ""
    if ! $DRY_RUN; then
        echo -e "${GREEN}${BOLD}Done.${NC} Plugin generated at: plugin/"
        echo ""
        echo "Next steps:"
        echo "  1. Review plugin/CLAUDE.md and customize the Absolute Directives"
        echo "  2. Update plugin/.claude-plugin/plugin.json with your metadata"
        echo "  3. Test: load the plugin/ folder in Claude Desktop Cowork"
    fi
}

cmd_to_cli() {
    detect_plugin_name

    echo ""
    echo -e "${BOLD}Converting Plugin to CLI format${NC}"
    echo -e "  Plugin name: ${GREEN}$PLUGIN_NAME${NC}"
    echo -e "  Source:      plugin/"
    echo -e "  Target:      .claude/"
    echo ""

    # 1. Convert skills -> commands
    convert_skills_to_commands "$PLUGIN_NAME"
    echo ""

    # 2. Sync agents
    sync_agents "to-cli"
    echo ""

    if ! $DRY_RUN; then
        echo -e "${GREEN}${BOLD}Done.${NC} CLI format updated at: .claude/"
        echo ""
        echo "Next steps:"
        echo "  1. Update the Commands table in CLAUDE.md if you added new skills"
        echo "  2. Add any rules to .claude/rules/ (not included in plugin format)"
    fi
}

cmd_diff() {
    detect_plugin_name

    echo ""
    echo -e "${BOLD}Comparing CLI and Plugin formats${NC}"
    echo -e "  Plugin name: $PLUGIN_NAME"
    echo ""

    local cmd_names skill_names
    read -ra cmd_names <<< "$(get_command_names)"
    read -ra skill_names <<< "$(get_skill_names)"

    # Find commands without matching skills
    local cli_only=() plugin_only=() both=()

    for name in "${cmd_names[@]}"; do
        [[ -z "$name" ]] && continue
        local found=false
        for sname in "${skill_names[@]}"; do
            [[ "$name" == "$sname" ]] && found=true
        done
        if $found; then
            both+=("$name")
        else
            cli_only+=("$name")
        fi
    done

    for name in "${skill_names[@]}"; do
        [[ -z "$name" ]] && continue
        local found=false
        for cname in "${cmd_names[@]}"; do
            [[ "$name" == "$cname" ]] && found=true
        done
        $found || plugin_only+=("$name")
    done

    # Report structural differences
    if [[ ${#cli_only[@]} -gt 0 ]]; then
        echo -e "${YELLOW}CLI only (no matching skill):${NC}"
        for name in "${cli_only[@]}"; do
            echo "  .claude/commands/$name.md"
        done
        echo ""
    fi

    if [[ ${#plugin_only[@]} -gt 0 ]]; then
        echo -e "${YELLOW}Plugin only (no matching command):${NC}"
        for name in "${plugin_only[@]}"; do
            echo "  plugin/skills/$name/SKILL.md"
        done
        echo ""
    fi

    # Content diff for matching pairs
    if [[ ${#both[@]} -gt 0 ]]; then
        local has_diff=false
        for name in "${both[@]}"; do
            local cmd_file="$CLI_COMMANDS/$name.md"
            local skill_file="$PLUGIN_SKILLS/$name/SKILL.md"
            if ! diff -q "$cmd_file" "$skill_file" > /dev/null 2>&1; then
                if ! $has_diff; then
                    echo -e "${YELLOW}Content differences:${NC}"
                    has_diff=true
                fi
                echo ""
                echo -e "  ${BOLD}$name${NC}:"
                diff --color=auto -u "$cmd_file" "$skill_file" 2>/dev/null | head -20 || true
            fi
        done

        if ! $has_diff; then
            echo -e "${GREEN}All matching commands/skills have identical content.${NC}"
        fi
        echo ""
    fi

    # Agent diff
    echo -e "${BOLD}Agents:${NC}"
    if [[ -d "$CLI_AGENTS" ]] && [[ -d "$PLUGIN_AGENTS" ]]; then
        local agent_diff=false
        while IFS= read -r -d '' cli_agent; do
            local rel="${cli_agent#"$CLI_AGENTS/"}"
            local plugin_agent="$PLUGIN_AGENTS/$rel"
            if [[ ! -f "$plugin_agent" ]]; then
                echo -e "  ${YELLOW}CLI only:${NC} $rel"
                agent_diff=true
            elif ! diff -q "$cli_agent" "$plugin_agent" > /dev/null 2>&1; then
                echo -e "  ${YELLOW}Different:${NC} $rel"
                agent_diff=true
            fi
        done < <(find "$CLI_AGENTS" -name "*.md" -print0)

        # Check for plugin-only agents
        while IFS= read -r -d '' plugin_agent; do
            local rel="${plugin_agent#"$PLUGIN_AGENTS/"}"
            local cli_agent="$CLI_AGENTS/$rel"
            if [[ ! -f "$cli_agent" ]]; then
                echo -e "  ${YELLOW}Plugin only:${NC} $rel"
                agent_diff=true
            fi
        done < <(find "$PLUGIN_AGENTS" -name "*.md" -print0)

        if ! $agent_diff; then
            echo -e "  ${GREEN}All agents are in sync.${NC}"
        fi
    else
        [[ ! -d "$CLI_AGENTS" ]] && echo "  No CLI agents directory"
        [[ ! -d "$PLUGIN_AGENTS" ]] && echo "  No plugin agents directory"
    fi
    echo ""
}

cmd_status() {
    detect_plugin_name

    echo ""
    echo -e "${BOLD}CO Conversion Status${NC}"
    echo -e "  Project:     $(basename "$PROJECT_ROOT")"
    echo -e "  Plugin name: $PLUGIN_NAME"
    echo ""

    # CLI format
    echo -e "${BOLD}CLI Format (.claude/)${NC}"
    if [[ -d "$CLI_COMMANDS" ]]; then
        local cmd_count=0
        for f in "$CLI_COMMANDS"/*.md; do
            [[ -f "$f" ]] && ((cmd_count++))
        done
        echo "  Commands: $cmd_count"
        for f in "$CLI_COMMANDS"/*.md; do
            [[ -f "$f" ]] && echo "    $(basename "$f" .md)"
        done
    else
        echo "  Commands: (none)"
    fi

    if [[ -d "$CLI_AGENTS" ]]; then
        local agent_count
        agent_count=$(find "$CLI_AGENTS" -name "*.md" | wc -l | tr -d ' ')
        echo "  Agents: $agent_count"
        find "$CLI_AGENTS" -name "*.md" -exec basename {} .md \; | sort | while read -r name; do
            echo "    $name"
        done
    else
        echo "  Agents: (none)"
    fi

    if [[ -d "$CLI_RULES" ]]; then
        local rule_count=0
        for f in "$CLI_RULES"/*.md; do
            [[ -f "$f" ]] && ((rule_count++))
        done
        echo "  Rules: $rule_count"
    fi
    echo ""

    # Plugin format
    echo -e "${BOLD}Plugin Format (plugin/)${NC}"
    if [[ -d "$PLUGIN_SKILLS" ]]; then
        local skill_count=0
        for d in "$PLUGIN_SKILLS"/*/; do
            [[ -d "$d" ]] && [[ -f "$d/SKILL.md" ]] && ((skill_count++))
        done
        echo "  Skills: $skill_count"
        for d in "$PLUGIN_SKILLS"/*/; do
            [[ -d "$d" ]] && [[ -f "$d/SKILL.md" ]] && echo "    $(basename "$d")"
        done
    else
        echo "  Skills: (none)"
    fi

    if [[ -d "$PLUGIN_AGENTS" ]]; then
        local agent_count
        agent_count=$(find "$PLUGIN_AGENTS" -name "*.md" | wc -l | tr -d ' ')
        echo "  Agents: $agent_count"
    else
        echo "  Agents: (none)"
    fi

    echo "  plugin.json: $([[ -f "$PLUGIN_JSON" ]] && echo "yes" || echo "no")"
    echo "  CLAUDE.md: $([[ -f "$PLUGIN_CLAUDE_MD" ]] && echo "yes" || echo "no")"
    echo ""
}

# ============================================================================
# Entry point
# ============================================================================

COMMAND=""
parse_args "$@"

case "$COMMAND" in
    to-plugin) cmd_to_plugin ;;
    to-cli)    cmd_to_cli ;;
    diff)      cmd_diff ;;
    status)    cmd_status ;;
esac
