import json
import re
from pathlib import Path

# ------------------------
# Конфигурация
# ------------------------

BASE_DIR = Path(__file__).parent
DB_DIR = BASE_DIR / "database"
OUTPUT_FILE = BASE_DIR / "data.json"
TOPICS_FILE = DB_DIR / "Train to DA.md"

LEVEL_PATTERN = re.compile(r"#(lvl_\d)")
TAG_PATTERN = re.compile(r"#(\w+)")


# ------------------------
# Парсинг тем
# ------------------------

def parse_topics(path: Path) -> dict:
    """
    Читает Train to DA.md и возвращает:
    { 'SQL': [1,2,3], 'Python': [4,5] }
    """
    topics = {}
    current_topic = None

    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()

        if line.startswith("## "):
            current_topic = line.replace("## ", "").strip()
            topics[current_topic] = []

        elif current_topic and "[[" in line:
            ids = re.findall(r"\[\[№(\d+)\]\]", line)
            topics[current_topic].extend(map(int, ids))

    return topics


# ------------------------
# Парсинг карточки
# ------------------------

def parse_card(path: Path) -> dict:
    raw = path.read_text(encoding="utf-8").strip()
    parts = [p.strip() for p in raw.split("---")]

    if len(parts) < 3:
        raise ValueError(f"Неверный формат карточки: {path.name}")

    question = parts[0]
    answer = parts[1]
    tags_raw = parts[2]

    tags = TAG_PATTERN.findall(tags_raw)
    level_match = LEVEL_PATTERN.search(tags_raw)

    return {
        "id": int(path.stem.replace("№", "")),
        "question": question,
        "answer": answer,
        "tags": [t for t in tags if not t.startswith("lvl")],
        "level": level_match.group(1) if level_match else None,
    }


# ------------------------
# Основная сборка
# ------------------------

def build():
    topics_map = parse_topics(TOPICS_FILE)
    cards = []

    for md_file in DB_DIR.glob("№*.md"):
        card = parse_card(md_file)

        # определяем тему карточки
        card_topic = None
        for topic, ids in topics_map.items():
            if card["id"] in ids:
                card_topic = topic
                break

        card["topic"] = card_topic
        cards.append(card)

    cards.sort(key=lambda x: x["id"])

    data = {
        "meta": {
            "total_cards": len(cards),
            "levels": sorted({c["level"] for c in cards if c["level"]}),
            "topics": sorted({c["topic"] for c in cards if c["topic"]}),
        },
        "cards": cards,
    }

    OUTPUT_FILE.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    print(f"✓ data.json собран: {len(cards)} карточек")


# ------------------------
# Entry point
# ------------------------

if __name__ == "__main__":
    build()
