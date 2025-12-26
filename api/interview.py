"""
Serverless функция для проверки ответов пользователя через OpenAI API.
"""

import json
import os
from openai import OpenAI


def handler(request):
    """
    Обработчик запросов от фронтенда.
    Принимает вопрос, эталонный ответ и ответ пользователя.
    Отправляет запрос в OpenAI API и возвращает оценку с фидбеком.
    """

    # CORS headers для всех ответов
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    }

    # Обработка preflight запроса (OPTIONS)
    if request.method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': ''
        }

    # Проверка метода запроса
    if request.method != 'POST':
        return {
            'statusCode': 405,
            'headers': headers,
            'body': json.dumps({'error': 'Method Not Allowed'}, ensure_ascii=False)
        }

    try:
        # Парсим тело запроса
        body = json.loads(request.body)

        question = body.get('question', '').strip()
        expected_answer = body.get('expected_answer', '').strip()
        user_answer = body.get('user_answer', '').strip()

        # Валидация входных данных
        if not question or not expected_answer or not user_answer:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'error': 'Отсутствуют обязательные поля: question, expected_answer, user_answer'
                }, ensure_ascii=False)
            }

        # Получаем настройки из ENV
        api_key = os.environ.get('OPENAI_API_KEY')
        model = os.environ.get('OPENAI_MODEL', 'gpt-4o-mini')

        if not api_key:
            return {
                'statusCode': 500,
                'headers': headers,
                'body': json.dumps({
                    'error': 'API ключ не настроен'
                }, ensure_ascii=False)
            }

        # Инициализируем OpenAI клиент
        client = OpenAI(api_key=api_key)

        # Формируем промпт для GPT
        prompt = f"""Ты — опытный интервьюер для позиции Data Analyst / Data Scientist.

Твоя задача: оценить ответ кандидата на вопрос по шкале от 1 до 10 и дать краткий конструктивный фидбек.

**Вопрос:**
{question}

**Эталонный ответ (для справки):**
{expected_answer}

**Ответ кандидата:**
{user_answer}

**Критерии оценки:**
- Полнота ответа (охватывает ли все ключевые моменты)
- Корректность (нет ли фактических ошибок)
- Структурированность (логично ли изложен)
- Практическая применимость

**Формат ответа (строго JSON):**
{{
  "score": <число от 1 до 10>,
  "feedback": "<краткий фидбек 2-3 предложения на русском>"
}}

Не добавляй никаких пояснений вне JSON. Верни только JSON."""

        # Запрос к OpenAI API
        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": "Ты — профессиональный интервьюер. Отвечай строго в формате JSON."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=300,
            response_format={"type": "json_object"}
        )

        # Извлекаем ответ
        result_text = response.choices[0].message.content.strip()
        result = json.loads(result_text)

        # Валидация результата
        score = result.get('score')
        feedback = result.get('feedback', '')

        if not isinstance(score, (int, float)) or not (1 <= score <= 10):
            raise ValueError('Некорректная оценка от GPT')

        if not feedback:
            raise ValueError('Пустой фидбек от GPT')

        # Возвращаем результат
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'score': int(score),
                'feedback': feedback
            }, ensure_ascii=False)
        }

    except json.JSONDecodeError as e:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({
                'error': f'Неверный формат JSON: {str(e)}'
            }, ensure_ascii=False)
        }

    except Exception as e:
        # Логируем ошибку (видно в Vercel Logs)
        print(f"Error: {str(e)}")

        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': 'Внутренняя ошибка сервера. Попробуйте позже.'
            }, ensure_ascii=False)
        }
