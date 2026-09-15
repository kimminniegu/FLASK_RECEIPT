document.addEventListener('DOMContentLoaded', () => {
    // 1. 탭 전환
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

    // 2. 영수증 렌더링
    const btnRenderReceipt = document.getElementById('btn-render-receipt');
    btnRenderReceipt.addEventListener('click', async () => {
        const mood = document.getElementById('receipt-mood').value;
        const taskText = document.getElementById('receipt-tasks').value;
        const tasks = taskText.split('\n').map(t => t.trim()).filter(t => t.length > 0);

        try {
            const res = await fetch('/api/generate-receipt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mood, tasks })
            });
            const data = await res.json();

            document.getElementById('rcpt-order-id').innerText = `ORD: ${data.order_id}`;
            document.getElementById('rcpt-date').innerText = `DATE: ${data.timestamp}`;
            document.getElementById('rcpt-count').innerText = data.total_items;
            document.getElementById('rcpt-energy').innerText = data.energy_used;
            document.getElementById('rcpt-mood-text').innerText = data.mood.toUpperCase();

            const itemList = document.getElementById('rcpt-item-list');
            itemList.innerHTML = '';
            data.tasks.forEach((item, idx) => {
                const row = document.createElement('div');
                row.className = 'row';
                row.innerHTML = `<span>${idx + 1}. ${item}</span><span>1.0</span>`;
                itemList.appendChild(row);
            });
        } catch (err) {
            console.error('영수증 생성 오류:', err);
        }
    });

    // 초기 영수증 1회 렌더링
    btnRenderReceipt.click();

    // 3. AI 파서 연동
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

            document.getElementById('receipt-mood').value = data.mood;
            document.getElementById('receipt-tasks').value = data.tasks.join('\n');

            // 영수증 자동 업데이트
            btnRenderReceipt.click();

        } catch (err) {
            alert('서버 통신 실패: ' + err);
        } finally {
            btnAiParse.disabled = false;
            btnAiParse.innerText = 'AI로 요약 및 채우기';
        }
    });

// 4. 생각 티켓 렌더링
    const btnRenderTicket = document.getElementById('btn-render-ticket');
    btnRenderTicket.addEventListener('click', () => {
        const name = document.getElementById('ticket-name').value.trim() || 'YOUR_NAME';
        const thought = document.getElementById('ticket-thought').value.trim() || 'HELLO, WORLD!';

        document.getElementById('tkt-name').innerText = name;
        document.getElementById('tkt-stub-name').innerText = name;
        document.getElementById('tkt-msg').innerText = `"${thought}"`;
    });

    // 5. 이미지 다운로드 함수 (투명도 지원)
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