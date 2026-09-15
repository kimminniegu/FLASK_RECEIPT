document.addEventListener('DOMContentLoaded', () => {
    // 1. 탭 전환 (영수증 <-> 생각 티켓)
    const tabBtns = document.querySelectorAll('.tab-btn');
    const sections = document.querySelectorAll('.content-section');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // 2. 영수증 렌더링 (칼로리 및 텍스트콘 Mood 반영)
    const btnRenderReceipt = document.getElementById('btn-render-receipt');
    btnRenderReceipt.addEventListener('click', async () => {
        const mood = document.getElementById('receipt-mood').value || '( •̀_•́) PRODUCTIVE';
        const taskText = document.getElementById('receipt-tasks').value;
        const rawLines = taskText.split('\n').map(t => t.trim()).filter(t => t.length > 0);

        try {
            const res = await fetch('/api/generate-receipt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mood, items: rawLines })
            });
            const data = await res.json();

            document.getElementById('rcpt-order-id').innerText = `ORD: ${data.order_id}`;
            document.getElementById('rcpt-date').innerText = `DATE: ${data.timestamp}`;
            document.getElementById('rcpt-count').innerText = data.total_items;
            document.getElementById('rcpt-energy').innerText = data.total_energy;
            document.getElementById('rcpt-mood-text').innerText = data.mood;

            const itemList = document.getElementById('rcpt-item-list');
            itemList.innerHTML = '';
            data.items.forEach((item, idx) => {
                const row = document.createElement('div');
                row.className = 'row';
                row.innerHTML = `
                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px;">
                        ${idx + 1}. ${item.task}
                    </span>
                    <span>${item.energy}</span>
                `;
                itemList.appendChild(row);
            });
        } catch (err) {
            console.error('영수증 생성 오류:', err);
        }
    });

    // 화면 시작 시 초기 영수증 1회 자동 렌더링
    btnRenderReceipt.click();

    // 3. AI 파서 연동 (AI 요약 + 칼로리 추정 + 아스키 표정 생성)
    const btnAiParse = document.getElementById('btn-ai-parse');
    btnAiParse.addEventListener('click', async () => {
        const chatInput = document.getElementById('ai-chat-input').value.trim();
        const selectedLang = document.querySelector('input[name="targetLang"]:checked').value;

        if (!chatInput) {
            alert('오늘의 하루 일과를 적어주세요!');
            return;
        }

        btnAiParse.disabled = true;
        btnAiParse.innerText = 'AI 분석 중...';

        try {
            const res = await fetch('/api/ai-summarize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: chatInput, lang: selectedLang })
            });

            const data = await res.json();

            if (data.error) {
                alert('오류가 발생했습니다: ' + data.error);
                return;
            }

            // 인풋 박스에 선 표정 포함 Mood 및 "항목 (칼로리)" 형식으로 자동 채우기
            document.getElementById('receipt-mood').value = data.mood;
            document.getElementById('receipt-tasks').value = data.items
                .map(item => `${item.task} (${item.energy})`)
                .join('\n');

            // 영수증 자동 업데이트 실행
            btnRenderReceipt.click();

        } catch (err) {
            alert('서버 통신 실패: ' + err);
        } finally {
            btnAiParse.disabled = false;
            btnAiParse.innerText = 'AI로 요약 및 채우기';
        }
    });

    // 4. 생각 티켓 렌더링 (기본값: YOUR_NAME / HELLO, WORLD!)
    const btnRenderTicket = document.getElementById('btn-render-ticket');
    btnRenderTicket.addEventListener('click', () => {
        const name = document.getElementById('ticket-name').value.trim() || 'YOUR_NAME';
        const thought = document.getElementById('ticket-thought').value.trim() || 'HELLO, WORLD!';

        document.getElementById('tkt-name').innerText = name;
        document.getElementById('tkt-stub-name').innerText = name;
        document.getElementById('tkt-msg').innerText = `"${thought}"`;
    });

    // 5. 고화질 이미지 다운로드 함수 (html2canvas)
    function setupDownload(btnId, targetId, fileName) {
        document.getElementById(btnId).addEventListener('click', () => {
            const target = document.getElementById(targetId);
            html2canvas(target, { 
                scale: 3,
                backgroundColor: null,
                useCORS: true
            }).then(canvas => {
                const link = document.createElement('a');
                link.download = fileName;
                link.href = canvas.toDataURL('image/png');
                link.click();
            });
        });
    }

    setupDownload('btn-download-receipt', 'receipt-target', 'my-daily-receipt.png');
    setupDownload('btn-download-ticket', 'ticket-target', 'my-mind-ticket.png');
});