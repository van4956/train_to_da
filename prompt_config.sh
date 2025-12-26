#!/bin/bash

# Скрипт для настройки промпта в bash
# Для запуска введите в терминале команду: bash setup_prompt.sh

echo "Настройка промпта для bash ..."

# Создаем бэкап текущего .bashrc
if [ -f ~/.bashrc ]; then
    cp ~/.bashrc ~/.bashrc.backup
    echo "Создан бэкап: ~/.bashrc.backup"
fi

# Добавляем кастомный промпт в .bashrc
cat >> ~/.bashrc << 'EOF'

# Кастомный промпт (динамическое имя проекта)
function set_custom_prompt() {
    # имя активного venv (если есть)
    local venv_name=""
    if [[ -n "$VIRTUAL_ENV" ]]; then
        venv_name="($(basename "$VIRTUAL_ENV")) "
    fi

    # определить имя проекта:
    # 1) имя корня git-репозитория, если внутри git
    # 2) иначе — имя текущей директории
    local project_name=""
    if git_root="$(git rev-parse --show-toplevel 2>/dev/null)"; then
        project_name="$(basename "$git_root")"
    else
        project_name="$(basename "$PWD")"
    fi

    # цвета
    local GREEN='\[\033[01;32m\]'
    local BLUE='\[\033[01;34m\]'
    local YELLOW='\[\033[01;33m\]'
    local RESET='\[\033[00m\]'

    # сам промпт
    PS1="${GREEN}${venv_name}${RESET}${BLUE}(${project_name})${RESET} ${YELLOW}\u${RESET}@~ \$ "
}

# Пересчитывать промпт перед каждым выводом приглашения
PROMPT_COMMAND="set_custom_prompt${PROMPT_COMMAND:+;${PROMPT_COMMAND}}"

EOF

echo "Промпт настроен!"
echo "Для применения изменений выполните: source ~/.bashrc"
echo "Или перезапустите терминал"

# Показываем что добавили
echo ""
echo "Добавлено в ~/.bashrc:"
echo "----------------------------------------"
tail -n 20 ~/.bashrc