import os
import json
import re
from flask import Flask, render_template, request, jsonify
from datetime import datetime
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

app = Flask(__name__)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

@app.route('/')
def index():
    return render_template('index.html')

# 1. 영수증 렌더링 API (수동 입력 및 계산 지원)
@app.route('/api/generate-receipt', methods=['POST'])
def generate_receipt():
    data = request.json or {}
    raw_items = data.get('items', [])
    mood = data.get('mood', '😐 NEUTRAL')

    processed_items = []
    total_energy = 0

    # 항목별 텍스트와 칼로리 처리 (예: "Deep work 4h (320)" 또는 단순 "Deep work 4h")
    for item in raw_items:
        if isinstance(item, dict):
            task = item.get('task', '')
            energy = int(item.get('energy', 50))
        else:
            task_str = str(item).strip()
            # 괄호 안의 숫자(kcal) 파싱 시도
            match = re.search(r'\((\d+)\s*(kcal)?\)', task_str, re.IGNORECASE)
            if match:
                energy = int(match.group(1))
                task = re.sub(r'\(.*?\)', '', task_str).strip()
            else:
                task = task_str
                energy = 80 # 기본값
        
        processed_items.append({'task': task, 'energy': energy})
        total_energy += energy

    total_items = len(processed_items)
    formatted_time = datetime.now().strftime("%Y.%m.%d %H:%M:%S")

    return jsonify({
        'status': 'success',
        'timestamp': formatted_time,
        'items': processed_items,
        'mood': mood,
        'total_items': total_items,
        'total_energy': f"{total_energy} kcal",
        'order_id': f"IMP-{datetime.now().strftime('%m%d%H%M')}"
    })

# 2. OpenAI 기반 일과 요약, 칼로리 추정 및 표정 Mood 추출
@app.route('/api/ai-summarize', methods=['POST'])
def ai_summarize():
    data = request.json or {}
    user_input = data.get('message', '').strip()
    target_lang = data.get('lang', 'EN')

    if not user_input:
        return jsonify({'error': '일과 내용을 입력해주세요.'}), 400

    lang_instruction = (
        "Translate and format the tasks and mood into concise, stylish ENGLISH receipt items."
        if target_lang == 'EN'
        else "Translate and format the tasks and mood into concise KOREAN receipt items."
    )

    prompt = f"""
You are an intelligent daily-log assistant for a minimalist thermal receipt generator.
User's story about today:
"{user_input}"

CRITICAL RULES FOR MOOD & EMOTICON:
1. Do NOT use any unicode/colored emojis (NO ☕, ⚡, 😴, 🔥, etc.).
2. You MUST use ONLY pure ASCII text-based facial expressions inside parentheses, such as:
   - Happy/Energetic: '( ^_^)b', '(^o^)/', '( *^▽^*)'
   - Hardworking/Focus: '( •̀_•́)', '(ง •̀_•́)ง'
   - Tired/Exhausted: '( -_・)', '(x_x)', '(-.-)Zzz'
   - Peaceful/Chill: '( ´ ▽ ` )', '( ˙-˙ )'
   - Overwhelmed: '(◎_◎;)'

Instructions:
1. Extract 3 to 6 specific action items / events.
2. For each task, estimate a realistic energy/calorie expenditure (integer only).
3. Formulate a mood string combining the text emoticon and a 1-3 word capitalized English/Korean summary.
   Examples of 'mood':
   - "( ^_^)b CAFFEINE POWER"
   - "( •̀_•́) PRODUCTIVE DAY"
   - "(x_x) FULLY BURNT OUT"
   - "( ´ ▽ ` ) PEACEFUL AFTERNOON"
4. {lang_instruction}
5. Respond ONLY with valid JSON matching:
{{
    "mood": "(TEXT_FACE) MOOD_TEXT",
    "items": [
        {{"task": "Task description", "energy": 320}},
        {{"task": "Task description", "energy": 45}}
    ]
}}
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You output strictly valid JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.7
        )
        
        parsed_result = json.loads(response.choices[0].message.content)
        return jsonify(parsed_result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)