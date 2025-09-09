document.addEventListener('DOMContentLoaded', function() {
    // --- DOM ELEMENT SELECTION ---
    const albumContainer = document.getElementById('albumContainer');
    const toc = document.getElementById('toc');
    const searchInput = document.getElementById('searchInput');
    const searchFieldInput = document.getElementById('searchField');
    const searchValueInput = document.getElementById('searchValue');
    const fieldRegexToggle = document.getElementById('fieldRegexToggle');
    const valueRegexToggle = document.getElementById('valueRegexToggle');
    const themeToggle = document.getElementById('themeToggle');
    const sortToggle = document.getElementById('sortToggle');
    const detailsSidebar = document.getElementById('details-sidebar');
    const sidebarContent = document.getElementById('sidebar-content');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const stickyPlayer = document.getElementById('sticky-player');
    const stickyPlayerContent = document.getElementById('sticky-player-content');
    const closeStickyPlayerBtn = document.getElementById('close-sticky-player-btn');
    const shortcutFieldSelect = document.getElementById('shortcutField');
    const shortcutPersonnelSelect = document.getElementById('shortcutPersonnel');
    const leftSidebar = document.querySelector('.sidebar');
    const leftResizer = document.getElementById('left-resizer');
    const rightResizer = document.getElementById('right-resizer');
    const tocCollapseToggle = document.getElementById('tocCollapseToggle');
    const collapsibleTocContent = document.getElementById('collapsibleTocContent');
    const tocToggleMobile = document.getElementById("tocToggleMobile");
    const sidebarBackdrop = document.getElementById("sidebar-backdrop");
    const detailsBackdrop = document.getElementById("details-backdrop");
    const searchHelpBtn = document.getElementById('searchHelpBtn');
    const helpModal = document.getElementById('helpModal');
    const helpModalClose = document.querySelector('.help-modal-close');
    const searchFieldPill = document.getElementById('searchFieldPill');

    // --- STATE MANAGEMENT ---
    let isSortReversed = false;
    let shortcutFieldOptions = []; // (NEW) Cache for pill logic

    // --- THEME MANAGEMENT ---
    function applyTheme(theme) {
        document.body.className = theme === 'light' ? 'light-theme' : 'dark-theme';
        if (themeToggle) {
            themeToggle.querySelector('i').className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
        }
    }
    function toggleTheme() {
        const newTheme = document.body.classList.contains('light-theme') ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    }
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    applyTheme(localStorage.getItem('theme') || 'dark');

    // --- SEARCH HELP MODAL ---
    function setupHelpModal() {
        if (!searchHelpBtn || !helpModal || !helpModalClose) return;
        searchHelpBtn.addEventListener('click', () => {
            helpModal.style.display = 'flex';
        });
        helpModalClose.addEventListener('click', () => {
            helpModal.style.display = 'none';
        });
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) {
                helpModal.style.display = 'none';
            }
        });
    }

    // --- HELP MODAL EXAMPLES ---
    function setupHelpModalExamples() {
        if (!helpModal) return;
        helpModal.addEventListener('click', (e) => {
            if (e.target.classList.contains('apply-example-btn')) {
                const exampleEl = e.target.closest('.example');
                if (!exampleEl) return;

                const { fieldValue, searchValue, fieldRegex, valueRegex } = exampleEl.dataset;
                
                searchFieldInput.value = fieldValue || '';
                searchValueInput.value = searchValue || '';
                fieldRegexToggle.checked = fieldRegex === 'true';
                valueRegexToggle.checked = valueRegex === 'true';

                searchFieldInput.dispatchEvent(new Event('input'));
                searchValueInput.dispatchEvent(new Event('input'));
                
                updatePillState(); // (NEW) Update pill on apply
                updateFilter();
                helpModal.style.display = 'none';
            }
        });
    }


    // --- SORTING ---
    function toggleAlbumSort() {
        isSortReversed = !isSortReversed;
        const albumSections = Array.from(albumContainer.querySelectorAll('.album-section'));
        const tocLinks = Array.from(toc.children);
        albumSections.reverse();
        tocLinks.reverse();
        albumContainer.innerHTML = '';
        toc.innerHTML = '';
        albumSections.forEach(section => albumContainer.appendChild(section));
        tocLinks.forEach(link => toc.appendChild(link));
        sortToggle.title = isSortReversed ? '專輯排序 (新→舊)' : '專輯排序 (舊→新)';
    }
    if (sortToggle) {
        sortToggle.addEventListener('click', toggleAlbumSort);
    }

    // --- DETAILS SIDEBAR & PLAYER ---
    function showDetails(track, albumId) {
        if (!track || !track.details) {
          return;
        }

        if (!detailsSidebar || !sidebarContent) return;

        let detailsListHtml = 'No details available.';
        if (track.details) {
            detailsListHtml = Object.entries(track.details)
                .filter(([key]) => !['track', 'album', 'date'].includes(key))
                .map(([key, value]) => `<p><strong>${key}:</strong> ${value}</p>`)
                .join('');
        }

        const playerHtml = track.id
            ? `<button class="load-player-btn" data-id="${track.id}">加載播放器</button>`
            : `<p class="no-id-message">此曲目沒有可用的播放源</p>`;

        sidebarContent.innerHTML = `
            <h2>${track.fullTitle}</h2>
            <p class="track-id">ID: ${track.id || 'N/A'}</p>
            <div class="details-list">${detailsListHtml}</div>
            <div class="player-container">${playerHtml}</div>
        `;

        if (albumId) {
            const tocLink = toc.querySelector(`a[href="#${albumId}"]`);
            toc.querySelectorAll('a').forEach(link => link.classList.remove('active-toc-link'));
            if (tocLink) {
                tocLink.classList.add('active-toc-link');
                tocLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        detailsSidebar.classList.add('is-open');
        if (detailsBackdrop) {
            detailsBackdrop.classList.add('is-visible');
        }
    }

    function closeDetailsSidebar() {
        detailsSidebar.classList.remove('is-open');
        if (detailsBackdrop) {
            detailsBackdrop.classList.remove('is-visible');
        }
    }
    
    function loadPlayer(id) {
        if (!stickyPlayer || !stickyPlayerContent) return;
        
        stickyPlayerContent.innerHTML = '';
        stickyPlayer.classList.add('is-loading');
        stickyPlayer.classList.add('is-visible');
        
        const iframe = document.createElement('iframe');
        iframe.frameBorder = "0";
        iframe.border = "0";
        iframe.marginWidth = "0";
        iframe.marginHeight = "0";
        iframe.width = "100%";
        iframe.height = "86";
        iframe.src = `https://music.163.com/outchain/player?type=2&id=${id}&auto=1&height=66`;
        
        iframe.style.opacity = '0';
        iframe.style.transition = 'opacity 0.3s ease';

        const onDone = () => {
            stickyPlayer.classList.remove('is-loading');
        };

        iframe.onload = () => {
            iframe.style.opacity = '1';
            onDone();
        };
        
        iframe.onerror = () => {
            stickyPlayerContent.innerHTML = '<p class="no-id-message">播放器加載失敗</p>';
            onDone();
        };

        stickyPlayerContent.appendChild(iframe);
    }


    if (detailsSidebar) {
        detailsSidebar.addEventListener('click', (e) => {
            if (e.target.classList.contains('load-player-btn')) {
                loadPlayer(e.target.dataset.id);
            }
        });
    }

    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', closeDetailsSidebar);
    }

    if (detailsBackdrop) {
        detailsBackdrop.addEventListener('click', closeDetailsSidebar);
    }
    
    if (closeStickyPlayerBtn) {
        closeStickyPlayerBtn.addEventListener('click', () => {
            stickyPlayer.classList.remove('is-visible');
            stickyPlayerContent.innerHTML = '';
        });
    }

    // --- MOBILE SIDEBAR TOGGLE ---
    if (tocToggleMobile && leftSidebar && sidebarBackdrop) {
        tocToggleMobile.addEventListener("click", () => {
            leftSidebar.classList.add("is-open");
            sidebarBackdrop.classList.add("is-visible");
        });
        sidebarBackdrop.addEventListener("click", () => {
            leftSidebar.classList.remove("is-open");
            sidebarBackdrop.classList.remove("is-visible");
        });
    }
    
    if (leftSidebar) {
      leftSidebar.classList.remove('is-open');
    }
    if (detailsSidebar) {
      detailsSidebar.classList.remove('is-open');
    }

    // --- SEARCH & FILTERING ---
    function checkAdvancedQuery(details, fieldQuery, valueQuery, isFieldRegex, isValueRegex) {
        if (!details) return null;

        let fieldRegex, valueRegex;
        try {
            if (isFieldRegex && fieldQuery) fieldRegex = new RegExp(fieldQuery, 'i');
            searchFieldInput.classList.remove('invalid-regex');
        } catch (e) {
            searchFieldInput.classList.add('invalid-regex');
            return null;
        }
        try {
            if (isValueRegex && valueQuery) valueRegex = new RegExp(valueQuery, 'i');
            searchValueInput.classList.remove('invalid-regex');
        } catch (e) {
            searchValueInput.classList.add('invalid-regex');
            return null;
        }

        const getKeywordTerms = (query) => {
            const queryLower = query.toLowerCase();
            const exacts = (queryLower.match(/"[^"]+"/g) || []).map(m => m.slice(1, -1));
            const keywords = queryLower.replace(/"[^"]+"/g, '').trim().split(/\s+/).filter(k => k);
            return [...exacts, ...keywords];
        };

        const fieldTerms = (isFieldRegex || !fieldQuery) ? [] : getKeywordTerms(fieldQuery);
        const valueTerms = (isValueRegex || !valueQuery) ? [] : getKeywordTerms(valueQuery);

        const candidateEntries = Object.entries(details).filter(([key]) => {
            if (!fieldQuery) return true;
            if (isFieldRegex) return fieldRegex.test(key);
            const keyLower = key.toLowerCase();
            return fieldTerms.some(term => keyLower.includes(term));
        });

        if (candidateEntries.length === 0) return null;
        if (!valueQuery) return Object.fromEntries(candidateEntries);

        const matchedEntries = candidateEntries.filter(([, value]) => {
            const valueString = String(value);
            if (isValueRegex) {
                return valueRegex.test(valueString);
            }
            const valueLower = valueString.toLowerCase();
            return valueTerms.every(term => valueLower.includes(term));
        });
        
        if (matchedEntries.length === 0) return null;
        return Object.fromEntries(matchedEntries);
    }


    function updateFilter() {
        const generalQuery = searchInput.value.toLowerCase().trim();
        const fieldQuery = searchFieldInput.value.trim();
        const valueQuery = searchValueInput.value.trim();
        const isFieldRegex = fieldRegexToggle.checked;
        const isValueRegex = valueRegexToggle.checked;

        if(!isFieldRegex) searchFieldInput.classList.remove('invalid-regex');
        if(!isValueRegex) searchValueInput.classList.remove('invalid-regex');

        document.querySelectorAll('#toc a').forEach(link => {
            const albumTitle = link.textContent.toLowerCase();
            link.classList.toggle('hidden', !albumTitle.includes(generalQuery));
        });

        document.querySelectorAll('.album-section').forEach(section => {
            const albumTitle = section.dataset.albumTitle.toLowerCase();
            const albumMatchesGeneral = albumTitle.includes(generalQuery);

            if (!albumMatchesGeneral) {
                section.classList.add('hidden');
                return;
            }

            let visibleCardCount = 0;
            section.querySelectorAll('.music-card').forEach(card => {
                const details = card.dataset.details ? JSON.parse(card.dataset.details) : null;
                const matchedData = checkAdvancedQuery(details, fieldQuery, valueQuery, isFieldRegex, isValueRegex);
                
                const cardIsVisible = matchedData !== null;
                card.classList.toggle('hidden', !cardIsVisible);

                const matchedInfoEl = card.querySelector('.matched-info');
                if (matchedInfoEl) {
                    matchedInfoEl.innerHTML = '';
                    matchedInfoEl.style.display = 'none';

                    if (cardIsVisible && matchedData && Object.keys(matchedData).length > 0 && (fieldQuery || valueQuery)) {
                        const html = Object.entries(matchedData).map(([key, value]) => {
                            const safeKey = key.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                            const safeValue = String(value).replace(/</g, "&lt;").replace(/>/g, "&gt;");
                            return `<p><strong>${safeKey}:</strong> ${safeValue}</p>`;
                        }).join('');
                        
                        if (html) {
                            matchedInfoEl.innerHTML = html;
                            matchedInfoEl.style.display = 'block';
                        }
                    }
                }

                if (cardIsVisible) {
                    visibleCardCount++;
                }
            });

            section.classList.toggle('hidden', visibleCardCount === 0);
        });
    }

    // --- RENDER PAGE & CARDS ---
    function createTrackCard(track, albumId) {
        const card = document.createElement('div');
        card.className = 'music-card';

        let chineseTitle = '';
        let englishTitle = '';
        const fullTitle = track.fullTitle.trim();
        
        const regex = /^([\u4e00-\u9fa5\s，。、]+)([^\u4e00-\u9fa5].*)?$/;
        const match = fullTitle.match(regex);
        
        if (match && match[2]) {
            chineseTitle = match[1].trim();
            englishTitle = match[2].trim();
        } else {
            chineseTitle = fullTitle;
            englishTitle = '';
        }
        
        card.innerHTML = `
            <div class="music-icon"><i class="fas ${track.id ? 'fa-play' : 'fa-file-alt'}"></i></div>
            <div class="track-info">
                <h3>${chineseTitle}</h3>
                <p>${englishTitle}&nbsp;</p>
                <div class="matched-info"></div>
            </div>`;
        
        if (track.details) card.dataset.details = JSON.stringify(track.details);

        card.addEventListener('click', () => showDetails(track, albumId));
        
        if (!track.id) {
            card.classList.add('no-id');
        }
        return card;
    }

    function renderPage(data) {
        if (!albumContainer || !toc) return;
        albumContainer.innerHTML = '';
        toc.innerHTML = '';
        data.forEach((album, index) => {
            const albumId = `album-${index}`;
            const tocLink = document.createElement('a');
            tocLink.href = `#${albumId}`;
            tocLink.textContent = album.title;
            toc.appendChild(tocLink);
            
            const albumSection = document.createElement('section');
            albumSection.className = 'album-section';
            albumSection.id = albumId;
            albumSection.dataset.albumTitle = album.title.toLowerCase();

            const summary = document.createElement('h2');
            summary.className = 'album-summary';
            summary.textContent = album.title;
            
            const musicGrid = document.createElement('div');
            musicGrid.className = 'music-grid';
            album.tracks.forEach(track => {
                musicGrid.appendChild(createTrackCard(track, albumId));
            });
            
            albumSection.appendChild(summary);
            albumSection.appendChild(musicGrid);
            albumContainer.appendChild(albumSection);
        });
    }

    // --- (NEW) PILL-LIKE INPUT MANAGEMENT ---
    function updatePillState() {
        const wrapper = searchFieldInput.parentElement;
        const currentValue = searchFieldInput.value;
        
        const matchedOption = shortcutFieldOptions.find(opt => opt.value === currentValue);

        if (matchedOption) {
            wrapper.classList.add('is-pilled');
            searchFieldPill.textContent = matchedOption.simpleText;
        } else {
            wrapper.classList.remove('is-pilled');
        }
    }


    // --- SHORTCUTS & SEARCH SETUP ---
    async function setupShortcuts(fieldKeys) {
        const pinnedFieldConfig = { "作曲": { keywords: ["作曲", "composer"], canonical: "Composer / 作曲", originals: new Set() }, "編曲": { keywords: ["编曲", "配器", "编配", "改编", "arranger", "adoption", "orchestrator", "original"], canonical: "Arranger / 編曲", originals: new Set() }, "作詞": { keywords: ["作词", "lyric", "lyricist"], canonical: "Lyricist / 作詞", originals: new Set() } };
        const pinnedOrder = ["作曲", "編曲", "作詞"];
        const fieldGroups = new Map();

        fieldKeys.forEach(key => {
            if (!key) return;
            const subKeys = key.split('/').map(s => s.trim()).filter(Boolean);
            subKeys.forEach(subKey => {
                let isPinned = false;
                for (const config of Object.values(pinnedFieldConfig)) {
                    if (config.keywords.some(kw => subKey.toLowerCase().includes(kw))) {
                        config.originals.add(subKey);
                        isPinned = true;
                        break;
                    }
                }
                if (isPinned) return;
                const chinesePart = (subKey.match(/[\u4e00-\u9fa5]+/g) || []).join(' ').trim();
                const englishPart = subKey.replace(/[\u4e00-\u9fa5]/g, '').replace(/[/\-()]/g, ' ').replace(/\s+/g, ' ').trim();
                const groupKey = chinesePart || englishPart.toLowerCase();
                if (!groupKey) return;
                if (!fieldGroups.has(groupKey)) {
                    fieldGroups.set(groupKey, { originals: new Set(), englishParts: new Set(), chineseParts: new Set() });
                }
                const group = fieldGroups.get(groupKey);
                group.originals.add(subKey);
                if (englishPart) group.englishParts.add(englishPart);
                if (chinesePart) group.chineseParts.add(chinesePart);
            });
        });

        if (shortcutFieldSelect) {
            shortcutFieldSelect.innerHTML = '<option value="">快捷輸入欄位</option>';
            const pinnedOptions = [];
            pinnedOrder.forEach(key => {
                const config = pinnedFieldConfig[key];
                if (config.originals.size > 0) {
                    const optionData = {
                        text: config.canonical,
                        value: [...config.originals].join(' '),
                        // (NEW) Data for pill logic
                        simpleText: key,
                        keywords: config.keywords
                    };
                    pinnedOptions.push(optionData);
                    shortcutFieldOptions.push(optionData); // Cache it
                }
            });
            const regularOptions = [];
            fieldGroups.forEach(group => {
                const terms = [...group.originals].map(item => {
                    const keySignatureRegex = /^[A-G](b|#)?调/;
                    let chinesePart, englishPart;
                    if (keySignatureRegex.test(item)) {
                        const keyAndChinese = item.match(/^[A-G](b|#)?调[\u4e00-\u9fa5]+/);
                        chinesePart = keyAndChinese ? keyAndChinese[0] : '';
                        englishPart = item.replace(chinesePart, '').trim();
                    } else {
                        chinesePart = (item.match(/[\u4e00-\u9fa5]+/g) || []).join(' ').trim();
                        englishPart = item.replace(/[\u4e00-\u9fa5]+/g, '').trim().replace(/\s+/g, ' ');
                    }
                    const parts = [];
                    if (chinesePart) parts.push(chinesePart);
                    if (englishPart) parts.push(englishPart.includes(' ') ? `"${englishPart}"` : englishPart);
                    return parts.join(' ');
                }).join(' ');
                const englishJoined = [...new Set([...group.englishParts])].sort().join(' / ');
                const chineseJoined = [...new Set([...group.chineseParts])].sort().join(' / ');
                let canonical = englishJoined && chineseJoined ? `${englishJoined} / ${chineseJoined}` : (englishJoined || chineseJoined);
                if (canonical && !/track|album|date/i.test(canonical)) {
                    regularOptions.push({ text: canonical, value: terms });
                }
            });
            regularOptions.sort((a, b) => a.text.localeCompare(b.text, 'zh-Hans-CN'));
            [...pinnedOptions, ...regularOptions].forEach(option => {
                shortcutFieldSelect.appendChild(new Option(option.text, option.value));
            });

            shortcutFieldSelect.addEventListener('change', (e) => {
                if (!e.target.value) return;
                searchFieldInput.value = e.target.value;
                fieldRegexToggle.checked = false;
                searchFieldInput.dispatchEvent(new Event('input'));
                e.target.selectedIndex = 0;
                updatePillState(); // (NEW) Update pill on select
                updateFilter();
            });
        }

        if (shortcutPersonnelSelect) {
            try {
                const response = await fetch('personnel.json');
                if (!response.ok) throw new Error(`HTTP 錯誤！狀態: ${response.status}`);
                const personnel = await response.json();
                personnel.forEach(name => shortcutPersonnelSelect.appendChild(new Option(name, name)));
            } catch (error) {
                console.error('無法載入或解析 personnel.json:', error);
                shortcutPersonnelSelect.style.display = 'none';
            }
            shortcutPersonnelSelect.addEventListener('change', (e) => {
                const selectedName = e.target.value;
                if (!selectedName) return;
                const currentVal = searchValueInput.value.trim();
                const newVal = selectedName.includes(' ') ? `"${selectedName}"` : selectedName;
                searchValueInput.value = currentVal ? `${currentVal} ${newVal}` : newVal;
                valueRegexToggle.checked = false;
                searchValueInput.dispatchEvent(new Event('input'));
                e.target.value = "";
                updateFilter();
            });
        }
    }
    
    // --- AUTOCOMPLETE FEATURE ---
    function setupAutocomplete() {
        let fieldOptionsForAutocomplete = [];
        let personnelOptions = [];

        setTimeout(() => {
            fieldOptionsForAutocomplete = Array.from(shortcutFieldSelect.options)
                .filter(opt => opt.value)
                .map(opt => ({ text: opt.textContent, value: opt.value }));
            personnelOptions = Array.from(shortcutPersonnelSelect.options)
                .filter(opt => opt.value)
                .map(opt => ({ text: opt.textContent, value: opt.textContent }));
        }, 1000); 

        const createAutocomplete = (inputEl, suggestionsEl, optionsSource) => {
            let activeIndex = -1;
            const updateSuggestions = () => {
                const query = inputEl.value.toLowerCase();
                suggestionsEl.innerHTML = '';
                suggestionsEl.style.display = 'none';
                activeIndex = -1;
                if (!query) return;
                const filtered = optionsSource()
                    .filter(opt => opt.text.toLowerCase().includes(query))
                    .slice(0, 5);
                if (filtered.length === 0) return;
                filtered.forEach((opt, index) => {
                    const item = document.createElement('div');
                    item.className = 'suggestion-item';
                    item.textContent = opt.text;
                    item.dataset.value = opt.value;
                    item.dataset.index = index;
                    item.addEventListener('mousedown', () => applySuggestion(opt));
                    suggestionsEl.appendChild(item);
                });
                suggestionsEl.style.display = 'block';
            };
            const applySuggestion = (option) => {
                inputEl.value = option.value;
                suggestionsEl.innerHTML = '';
                suggestionsEl.style.display = 'none';
                if (inputEl === searchFieldInput) updatePillState(); // (NEW) Update pill
                updateFilter();
            };
            const navigateSuggestions = (e) => {
                const items = suggestionsEl.querySelectorAll('.suggestion-item');
                if (items.length === 0) return;
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    activeIndex = (activeIndex + 1) % items.length;
                    updateActiveItem();
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    activeIndex = (activeIndex - 1 + items.length) % items.length;
                    updateActiveItem();
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (activeIndex > -1) items[activeIndex].dispatchEvent(new Event('mousedown'));
                } else if (e.key === 'Escape') {
                    suggestionsEl.style.display = 'none';
                }
            };
            const updateActiveItem = () => {
                const items = suggestionsEl.querySelectorAll('.suggestion-item');
                items.forEach((item, index) => item.classList.toggle('is-active', index === activeIndex));
            };
            inputEl.addEventListener('input', updateSuggestions);
            inputEl.addEventListener('focus', updateSuggestions);
            inputEl.addEventListener('keydown', navigateSuggestions);
            document.addEventListener('click', (e) => {
                if (!inputEl.contains(e.target)) suggestionsEl.style.display = 'none';
            });
        };
        createAutocomplete(searchFieldInput, document.getElementById('field-suggestions'), () => fieldOptionsForAutocomplete);
        createAutocomplete(searchValueInput, document.getElementById('value-suggestions'), () => personnelOptions);
    }
    
    function setupClearButtons() {
        const fields = [{ input: searchInput, btn: document.getElementById('clearSearchInput') }, { input: searchFieldInput, btn: document.getElementById('clearSearchField') }, { input: searchValueInput, btn: document.getElementById('clearSearchValue') }, ];
        fields.forEach(({ input, btn }) => {
            if (btn) {
                btn.addEventListener('click', () => {
                    input.value = '';
                    if (input === searchFieldInput) updatePillState(); // (NEW) Update pill
                    input.dispatchEvent(new Event('input'));
                    updateFilter();
                    input.focus();
                });
            }
        });
    }

    function setupQuickSearchButtons() {
        document.querySelectorAll('.quick-search-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                searchInput.value = e.target.dataset.query;
                searchInput.dispatchEvent(new Event('input'));
                updateFilter();
            });
        });
    }
    
    function setupResizers() {
        let isResizing = false;
        function onMouseDown(e, element, direction) {
            isResizing = true;
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'ew-resize';
            function onMouseMove(e) {
                if (!isResizing) return;
                const newWidth = (direction === 'left') ? e.clientX : (document.body.clientWidth - e.clientX);
                element.style.width = `${newWidth}px`;
            }
            function onMouseUp() {
                isResizing = false;
                document.body.style.userSelect = 'auto';
                document.body.style.cursor = 'auto';
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        }
        if (leftResizer && leftSidebar) leftResizer.addEventListener('mousedown', (e) => onMouseDown(e, leftSidebar, 'left'));
        if (rightResizer && detailsSidebar) rightResizer.addEventListener('mousedown', (e) => onMouseDown(e, detailsSidebar, 'right'));
    }
    
    function setupScrollSpy() {
        const sections = document.querySelectorAll('.album-section');
        if (sections.length === 0) return;
        const observerCallback = (entries) => {
            entries.forEach(entry => {
                const link = toc.querySelector(`a[href="#${entry.target.id}"]`);
                if (link) link.dataset.visible = entry.isIntersecting;
            });
            const firstVisibleLink = Array.from(toc.querySelectorAll('a')).find(link => link.dataset.visible === 'true');
            const currentActiveLink = toc.querySelector('.active-toc-link');
            if (firstVisibleLink && firstVisibleLink !== currentActiveLink) {
                if (currentActiveLink) currentActiveLink.classList.remove('active-toc-link');
                firstVisibleLink.classList.add('active-toc-link');
                firstVisibleLink.scrollIntoView({ behavior: 'auto', block: 'nearest' });
            } else if (!currentActiveLink && toc.children.length > 0) {
                const firstTocLink = toc.querySelector('a');
                if(firstTocLink) firstTocLink.classList.add('active-toc-link');
            }
        };
        const observer = new IntersectionObserver(observerCallback, { root: albumContainer, threshold: 0.1, rootMargin: '0px 0px -25% 0px' });
        sections.forEach(section => observer.observe(section));
    }
    
    function setupTocClickHandler() {
        if (!toc) return;
        toc.addEventListener('click', function(e) {
            if (e.target.tagName === 'A') {
                e.preventDefault(); 
                const currentActiveLink = toc.querySelector('.active-toc-link');
                if (currentActiveLink) currentActiveLink.classList.remove('active-toc-link');
                const clickedLink = e.target;
                clickedLink.classList.add('active-toc-link');
                const targetId = clickedLink.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                if (targetElement) targetElement.scrollIntoView();
            }
        });
    }

    function updateLayout() {
        const header = document.querySelector('.header');
        if (header) {
            const headerHeight = header.offsetHeight;
            const style = `top: ${headerHeight}px; height: calc(100vh - ${headerHeight}px);`;
            if (window.innerWidth <= 768) {
                if (leftSidebar) leftSidebar.style = style;
                if (detailsSidebar) detailsSidebar.style = style;
            } else {
                if (leftSidebar) leftSidebar.style.height = `calc(100vh - ${headerHeight}px)`;
                if (detailsSidebar) detailsSidebar.style.height = `calc(100vh - ${headerHeight}px)`;
            }
        }
    }
    
    // --- INITIALIZATION ---
    async function initializeApp() {
        try {
            const idMap = new Map();
            const idManifestResponse = await fetch('IDs/manifest.json');
            const idManifest = await idManifestResponse.json();
            const idFilePromises = idManifest.albums.map(filename => fetch(`IDs/${filename}`).then(res => res.text()));
            const normalizeTitle = (title) => title ? title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '') : '';
            const idFiles = await Promise.allSettled(idFilePromises);
            idFiles.forEach(result => {
                if (result.status === 'fulfilled') {
                    result.value.trim().split('\n').forEach(line => {
                        const parts = line.split('\t');
                        if (parts.length >= 2) {
                          const normalizedTrackName = normalizeTitle(parts[1]);
                          if (normalizedTrackName) idMap.set(normalizedTrackName, parts[0].trim());
                        }
                    });
                }
            });

            const dataIndexResponse = await fetch('data/data.json');
            const dataIndex = await dataIndexResponse.json();
            const allFilePaths = Object.values(dataIndex).flat();
            const detailPromises = allFilePaths.map(file => fetch(`data/${file}`).then(res => res.json()));
            const settledDetails = await Promise.allSettled(detailPromises);
            
            const fieldKeys = new Set();
            const allAlbumData = settledDetails
                .filter(result => result.status === 'fulfilled')
                .flatMap(result => result.value) 
                .map(albumData => {
                    const tracks = albumData.tracks.map(trackDetail => {
                        Object.keys(trackDetail).forEach(key => fieldKeys.add(key));
                        const fullTitle = trackDetail.track;
                        return { id: idMap.get(normalizeTitle(fullTitle)) || null, fullTitle: fullTitle, details: trackDetail };
                    });
                    return { title: albumData.album, tracks };
                });
            
            renderPage(allAlbumData);
            await setupShortcuts(Array.from(fieldKeys));
            setupClearButtons();
            setupQuickSearchButtons();
            setupResizers();
            setupScrollSpy();
            setupTocClickHandler();
            setupHelpModal();
            setupHelpModalExamples();
            setupAutocomplete();
            updateLayout(); 
            window.addEventListener('resize', updateLayout);

            // (NEW) Add focus/blur listeners for pill UI
            searchFieldInput.addEventListener('focus', () => {
                searchFieldInput.parentElement.classList.remove('is-pilled');
            });
            searchFieldInput.addEventListener('blur', () => {
                // Auto-expand simple keywords to full value
                if (!fieldRegexToggle.checked) {
                    const term = searchFieldInput.value.trim().toLowerCase();
                    if (term) {
                        const matchedOption = shortcutFieldOptions.find(opt => opt.keywords.includes(term));
                        if (matchedOption) {
                            searchFieldInput.value = matchedOption.value;
                            updateFilter();
                        }
                    }
                }
                updatePillState();
            });


        } catch (error) {
            if (albumContainer) albumContainer.innerHTML = `<p style="color: red; text-align: center;">初始化失敗: ${error.message}</p>`;
            console.error("Initialization Error:", error);
        }
    }

    [searchInput, searchFieldInput, searchValueInput, fieldRegexToggle, valueRegexToggle].forEach(el => {
        if (el) {
            const eventType = el.type === 'checkbox' ? 'change' : 'input';
            el.addEventListener(eventType, updateFilter);
        }
    });
    
    initializeApp();
});