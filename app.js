const app = {
    data: null,
    currentDay: null,
    history: [],

    async init() {
        try {
            const response = await fetch('agenda_data.json');
            this.data = await response.json();
            
            this.setupTabs();
            this.setupSearch();
            this.renderAgenda(this.data.agenda[0].day);
            
            // Handle browser back button
            window.onpopstate = (event) => {
                if (event.state) {
                    this.navigate(event.state.view, event.state.id, false);
                } else {
                    this.showAgenda(false);
                }
            };
        } catch (error) {
            console.error("Failed to load agenda data:", error);
        }
    },

    setupTabs() {
        const tabsContainer = document.getElementById('day-tabs');
        this.data.agenda.forEach((day, index) => {
            const btn = document.createElement('button');
            btn.className = `tab ${index === 0 ? 'active' : ''}`;
            btn.textContent = day.day;
            btn.onclick = () => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                btn.classList.add('active');
                this.renderAgenda(day.day);
            };
            tabsContainer.appendChild(btn);
        });
    },

    setupSearch() {
        const searchInput = document.getElementById('global-search');
        searchInput.oninput = (e) => {
            const query = e.target.value.toLowerCase();
            if (query.length > 1) {
                this.performSearch(query);
            } else if (query.length === 0) {
                this.showAgenda();
            }
        };
    },

    renderAgenda(dayLabel) {
        this.currentDay = dayLabel;
        const dayData = this.data.agenda.find(d => d.day === dayLabel);
        const container = document.getElementById('agenda-grid');
        container.innerHTML = '';
        
        this.showView('agenda-grid');

        dayData.slots.forEach(slot => {
            const slotEl = document.createElement('div');
            slotEl.className = 'slot';
            
            const timeEl = document.createElement('div');
            timeEl.className = 'slot-time';
            timeEl.textContent = slot.time;
            slotEl.appendChild(timeEl);

            const gridEl = document.createElement('div');
            gridEl.className = 'sessions-grid';
            
            slot.sessions.forEach(session => {
                const card = document.createElement('div');
                card.className = 'session-card';
                
                // Special handling for multi-line titles (Keynotes, etc.)
                const titleParts = session.title.split('\n').filter(p => p.trim() !== '');
                const displayTitle = titleParts[0];
                const subInfo = titleParts.slice(1).map(p => `<div class="session-subinfo">${p}</div>`).join('');

                if (session.papers.length > 0) {
                    card.onclick = () => this.showSession(slot.time, session);
                } else {
                    card.style.cursor = 'default';
                }
                
                const room = session.room ? `<div class="room-tag">${session.room}</div>` : '';
                const paperCount = session.papers.length > 0 ? `<div class="paper-count">${session.papers.length} Papers</div>` : '';
                
                card.innerHTML = `
                    ${room}
                    <div class="session-title">${displayTitle}</div>
                    <div class="session-subinfo-container">${subInfo}</div>
                    ${paperCount}
                `;
                gridEl.appendChild(card);
            });

            slotEl.appendChild(gridEl);
            container.appendChild(slotEl);
        });
    },

    showSession(time, session, pushState = true) {
        const info = document.getElementById('session-info');
        const list = document.getElementById('paper-list');
        
        info.innerHTML = `
            <div class="room-tag">${session.room} | ${time}</div>
            <h2 style="margin-bottom: 30px;">${session.title}</h2>
        `;
        
        list.innerHTML = '';
        session.papers.forEach(pid => {
            const paper = this.data.papers[pid];
            if (!paper) return;
            
            const item = document.createElement('div');
            item.className = 'paper-item';
            item.onclick = () => this.showPaper(paper);
            item.innerHTML = `
                <div class="speaker-name">${paper.speaker}</div>
                <div class="paper-title">${paper.title}</div>
            `;
            list.appendChild(item);
        });

        this.showView('session-detail');
        if (pushState) history.pushState({view: 'session', time, session}, '');
    },

    showPaper(paper, pushState = true) {
        const info = document.getElementById('paper-info');
        info.innerHTML = `
            <div class="speaker-name" style="font-size: 2rem;">${paper.speaker}</div>
            <div class="affiliation">${paper.affiliation}</div>
            <div class="paper-title" style="font-size: 1.4rem; color: white; margin-bottom: 20px;">${paper.title}</div>
            <hr style="border: none; border-top: 1px solid var(--glass-border); margin: 20px 0;">
            <div class="abstract-text">
                <h3 style="color: var(--accent); margin-bottom: 10px;">Abstract</h3>
                ${paper.abstract}
            </div>
        `;
        
        this.showView('paper-detail');
        if (pushState) history.pushState({view: 'paper', id: paper.id}, '');
    },

    performSearch(query) {
        const results = [];
        Object.values(this.data.papers).forEach(paper => {
            if (paper.title.toLowerCase().includes(query) || 
                paper.speaker.toLowerCase().includes(query) ||
                paper.abstract.toLowerCase().includes(query)) {
                results.push(paper);
            }
        });

        const list = document.getElementById('results-list');
        list.innerHTML = '';
        results.forEach(paper => {
            const item = document.createElement('div');
            item.className = 'paper-item';
            item.onclick = () => this.showPaper(paper);
            item.innerHTML = `
                <div class="speaker-name">${paper.speaker}</div>
                <div class="paper-title">${paper.title}</div>
            `;
            list.appendChild(item);
        });

        this.showView('search-results');
    },

    showView(id) {
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
        window.scrollTo(0, 0);
    },

    showAgenda(pushState = true) {
        this.showView('agenda-grid');
        if (pushState) history.pushState(null, '');
    },

    backToSession() {
        this.showView('session-detail');
    },

    navigate(view, id, pushState) {
        // Simple router logic
        if (view === 'paper') {
            this.showPaper(this.data.papers[id], pushState);
        }
    }
};

app.init();
