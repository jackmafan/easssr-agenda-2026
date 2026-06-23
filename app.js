const app = {
    data: null,
    currentDay: null,
    history: [],
    paperToSession: {},
    isInitialLoad: true,

    formatAuthors(speaker, coAuthors) {
        if (!coAuthors || coAuthors.length === 0) return speaker || "";
        if (coAuthors.length === 1) return `${speaker} and ${coAuthors[0]}`;
        return `${speaker}, ${coAuthors.slice(0, -1).join(', ')}, and ${coAuthors[coAuthors.length - 1]}`;
    },

    async init() {
        try {
            const response = await fetch('agenda_data.json');
            this.data = await response.json();

            this.setupTabs();
            this.buildPaperMap();
            this.setupSearch();

            this.showHome(false);

            // Handle browser back button
            window.onpopstate = (event) => {
                if (event.state) {
                    if (event.state.view === 'home') {
                        this.showHome(false);
                    } else if (event.state.view === 'agenda') {
                        this.showAgenda(false);
                    } else {
                        this.navigate(event.state.view, event.state.id, false);
                    }
                } else {
                    this.showHome(false);
                }
            };
        } catch (error) {
            console.error("Failed to load agenda data:", error);
        }
    },

    buildPaperMap() {
        this.paperToSession = {};
        if (!this.data || !this.data.agenda) return;

        this.data.agenda.forEach(day => {
            if (!day.slots) return;
            day.slots.forEach(slot => {
                if (!slot.sessions) return;
                slot.sessions.forEach(session => {
                    if (!session.papers) return;
                    session.papers.forEach(pid => {
                        this.paperToSession[pid] = {
                            day: day.day,
                            date: day.date,
                            time: slot.time,
                            room: session.room,
                            session: session
                        };
                    });
                });
            });
        });
    },

    formatDate(dateStr) {
        if (!dateStr) return "";
        const parts = dateStr.split('-');
        if (parts.length < 3) return dateStr;
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        const months = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const monthName = months[month] || "";
        let suffix = "th";
        if (day === 1 || day === 21 || day === 31) suffix = "st";
        else if (day === 2 || day === 22) suffix = "nd";
        else if (day === 3 || day === 23) suffix = "rd";
        return `${monthName} ${day}${suffix}`;
    },

    setupTabs() {
        const tabsContainer = document.getElementById('day-tabs');
        tabsContainer.innerHTML = '';

        // Add Home Tab Button
        const homeBtn = document.createElement('button');
        homeBtn.className = 'tab active';
        homeBtn.setAttribute('data-day', 'Home');
        homeBtn.textContent = 'Home';
        homeBtn.onclick = () => {
            this.showHome();
        };
        tabsContainer.appendChild(homeBtn);

        this.data.agenda.forEach((day) => {
            const btn = document.createElement('button');
            btn.className = 'tab';
            btn.setAttribute('data-day', day.day);
            const dateLabel = this.formatDate(day.date);
            const cleanDay = day.day.replace(/\s+/g, ' ');
            btn.textContent = dateLabel ? `${cleanDay} | ${dateLabel}` : cleanDay;
            btn.onclick = () => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                btn.classList.add('active');
                this.renderAgenda(day.day, true);
            };
            tabsContainer.appendChild(btn);
        });
    },

    setupSearch() {
        const searchInput = document.getElementById('global-search');
        const searchBtn = document.getElementById('search-trigger');

        if (!searchInput) return;

        const doSearch = () => {
            const query = searchInput.value.trim();
            if (query.length > 0) {
                this.performSearch(query);
            } else {
                this.showAgenda();
            }
        };

        searchInput.oninput = (e) => {
            const query = e.target.value.trim();
            if (query.length === 0) {
                this.showAgenda();
            }
            // Real-time search for length > 2
            if (query.length > 2) {
                this.performSearch(query);
            }
        };

        searchInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                doSearch();
            }
        };

        if (searchBtn) {
            searchBtn.onclick = (e) => {
                e.preventDefault();
                doSearch();
            };
        }

        // Checkbox search filter real-time trigger
        const filterTitle = document.getElementById('filter-title');
        const filterAuthor = document.getElementById('filter-author');
        const filterAbstract = document.getElementById('filter-abstract');

        const onFilterChange = () => {
            const query = searchInput.value.trim();
            if (query.length > 0) {
                this.performSearch(query);
            }
        };

        if (filterTitle) filterTitle.onchange = onFilterChange;
        if (filterAuthor) filterAuthor.onchange = onFilterChange;
        if (filterAbstract) filterAbstract.onchange = onFilterChange;
    },

    renderAgenda(dayLabel, changeView = true) {
        this.currentDay = dayLabel;
        const dayData = this.data.agenda.find(d => d.day === dayLabel);
        const container = document.getElementById('agenda-grid');
        container.innerHTML = '';

        if (changeView) {
            this.showView('agenda-grid');
        }

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
                if (session.room) {
                    card.setAttribute('data-room', session.room);
                }

                // Special handling for multi-line titles (Keynotes, etc.)
                const titleParts = session.title.split('\n').filter(p => p.trim() !== '');
                const displayTitle = titleParts[0];
                const subInfo = titleParts.slice(1).map(p => `<div class="session-subinfo">${p}</div>`).join('');

                if (session.papers.length > 0) {
                    card.onclick = () => this.showSession(slot.time, session);
                } else {
                    card.style.cursor = 'default';
                }

                const displayRoom = (session.room && session.room.trim()) ? session.room : '&nbsp;';
                const room = `<div class="room-tag">${displayRoom}</div>`;
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
        this.currentPaperSession = { time, session };

        // Sync tab and background agenda grid
        let sessionDay = null;
        if (session.papers && session.papers.length > 0) {
            const firstPaperMeta = this.paperToSession[session.papers[0]];
            if (firstPaperMeta) {
                sessionDay = firstPaperMeta.day;
            }
        }
        if (sessionDay) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            const targetTab = document.querySelector(`.tab[data-day="${sessionDay}"]`);
            if (targetTab) targetTab.classList.add('active');
            this.renderAgenda(sessionDay, false);
        }

        const info = document.getElementById('session-info');
        const list = document.getElementById('paper-list');

        const roomText = (session.room && session.room.trim()) ? `${session.room} | ` : '';
        info.innerHTML = `
            <div class="room-tag">${roomText}${time}</div>
            <h2 style="margin-bottom: 30px;">${session.title}</h2>
        `;

        list.innerHTML = '';
        session.papers.forEach(pid => {
            const paper = this.data.papers[pid];
            if (paper && !paper.deprecated) {
                const authorsText = this.formatAuthors(paper.speaker, paper.co_authors);
                const item = document.createElement('div');
                item.className = 'paper-item';
                item.onclick = () => this.showPaper(paper);
                item.innerHTML = `
                    <div class="speaker-name">${authorsText}</div>
                    <div class="paper-title">${paper.title}</div>
                `;
                list.appendChild(item);
            }
        });

        this.showView('session-detail');
        if (pushState) history.pushState({ view: 'session', time, session }, '');
    },

    showPaper(paper, pushState = true) {
        const info = document.getElementById('paper-info');
        const meta = this.paperToSession[paper.id];
        if (meta) {
            this.currentPaperSession = { time: meta.time, session: meta.session };

            // Sync tab and background agenda grid
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            const targetTab = document.querySelector(`.tab[data-day="${meta.day}"]`);
            if (targetTab) targetTab.classList.add('active');
            this.renderAgenda(meta.day, false);
        }
        const dateLabel = meta ? this.formatDate(meta.date) : '';
        const cleanDay = meta ? meta.day.replace(/\s+/g, ' ') : '';
        const dayDisplay = dateLabel ? `${cleanDay} (${dateLabel})` : cleanDay;
        const roomText = (meta && meta.room && meta.room.trim()) ? ` | ${meta.room}` : '';
        const metaInfo = meta ? `<div class="search-meta" style="margin-bottom: 5px;">${dayDisplay} | ${meta.time}${roomText}</div>` : '';

        const authorsText = this.formatAuthors(paper.speaker, paper.co_authors);

        info.innerHTML = `
            ${metaInfo}
            <div class="speaker-name" style="font-size: 1.5rem; margin-bottom: 2px;">${authorsText}</div>
            <div class="affiliation" style="margin-top: 5px;">${paper.affiliation}</div>
            <hr style="border: none; border-top: 1px solid var(--glass-border); margin: 20px 0;">
            <div class="paper-title" style="font-size: 1.5rem; margin-bottom: 5px;">${paper.title}</div>
            <div class="abstract-text">
                <div style="color: var(--accent);font-size: 1rem; font-weight: 600; margin-bottom: 5px;">Abstract</div>
                ${paper.abstract}
            </div>
        `;

        this.showView('paper-detail');
        if (pushState) history.pushState({ view: 'paper', id: paper.id }, '');
    },

    highlightText(text, keywords) {
        if (!text || !keywords || keywords.length === 0) return text;
        let highlighted = text;
        keywords.forEach(keyword => {
            if (!keyword) return;
            const escapedKeyword = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp(`(${escapedKeyword})`, 'gi');
            highlighted = highlighted.replace(regex, '<mark>$1</mark>');
        });
        return highlighted;
    },

    performSearch(query) {
        if (!query) return;
        const q = query.toLowerCase();
        const keywords = q.split(/\s+/).filter(k => k.length > 0);

        const searchTitle = document.getElementById('filter-title')?.checked;
        const searchAuthor = document.getElementById('filter-author')?.checked;
        const searchAbstract = document.getElementById('filter-abstract')?.checked;

        const results = Object.values(this.data.papers).filter(paper => {
            if (paper.deprecated) return false;

            let searchParts = [];
            if (searchTitle) searchParts.push(paper.title || "");
            if (searchAuthor) {
                searchParts.push(paper.speaker || "");
                if (paper.co_authors && paper.co_authors.length > 0) {
                    searchParts.push(paper.co_authors.join(" "));
                }
            }
            if (searchAbstract) searchParts.push(paper.abstract || "");

            const content = searchParts.join(" ").toLowerCase();
            return keywords.every(k => content.includes(k));
        });

        const list = document.getElementById('results-list');
        if (!list) return;
        list.innerHTML = '';

        if (results.length === 0) {
            list.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-dim);">No results found.</div>';
        } else {
            results.forEach(paper => {
                const meta = this.paperToSession[paper.id];
                const dateLabel = meta ? this.formatDate(meta.date) : '';
                const cleanDay = meta ? meta.day.replace(/\s+/g, ' ') : '';
                const dayDisplay = dateLabel ? `${cleanDay} (${dateLabel})` : cleanDay;
                const roomText = (meta && meta.room && meta.room.trim()) ? ` | ${meta.room}` : '';
                const metaInfo = meta ? `<div class="search-meta">${dayDisplay} | ${meta.time}${roomText}</div>` : '';

                const authorsText = this.formatAuthors(paper.speaker, paper.co_authors);
                const authorsHtml = this.highlightText(authorsText, keywords);
                const titleHtml = this.highlightText(paper.title, keywords);

                const item = document.createElement('div');
                item.className = 'paper-item';
                item.onclick = () => this.showPaper(paper);
                item.innerHTML = `
                    ${metaInfo}
                    <div class="speaker-name">${authorsHtml}</div>
                    <div class="paper-title">${titleHtml}</div>
                `;
                list.appendChild(item);
            });
        }

        this.showView('search-results');
    },

    showView(id) {
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');

        const header = document.getElementById('app-header');
        if (header) {
            header.classList.remove('hidden');
        }

        if (this.isInitialLoad) {
            window.scrollTo(0, 0);
            this.isInitialLoad = false;
        } else if (id !== 'search-results') {
            const banner = document.querySelector('.banner-container');
            const bannerHeight = banner ? banner.offsetHeight : 0;
            window.scrollTo(0, bannerHeight);
        }
    },

    showHome(pushState = true) {
        this.showView('home-view');
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        const homeTab = document.querySelector('.tab[data-day="Home"]');
        if (homeTab) {
            homeTab.classList.add('active');
        }
        if (pushState) history.pushState({ view: 'home' }, '');
    },

    showAgenda(pushState = true) {
        this.showView('agenda-grid');
        if (pushState) history.pushState({ view: 'agenda' }, '');
    },

    backToSession() {
        if (this.currentPaperSession) {
            this.showSession(this.currentPaperSession.time, this.currentPaperSession.session, false);
        } else {
            this.showAgenda();
        }
    },

    navigate(view, id, pushState) {
        // Simple router logic
        if (view === 'paper') {
            this.showPaper(this.data.papers[id], pushState);
        } else if (view === 'home') {
            this.showHome(false);
        } else if (view === 'agenda') {
            this.showAgenda(false);
        }
    }
};

app.init();
