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
    const trackSortToggle = document.getElementById('trackSortToggle'); // NEW: global track sort toggle
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
    const header = document.querySelector('.header');
    const exportBtn = document.getElementById('exportBtn');
    const exportModal = document.getElementById('exportModal');
    const exportModalClose = document.getElementById('exportModalClose');
    const confirmExportBtn = document.getElementById('confirmExportBtn');
    const searchSortToggle = document.getElementById('searchSortToggle');
    let isSearchTrackReversed = false;
    // --- NEW ---: Minimized player element
    let minimizedPlayer = null;

    // --- STATE MANAGEMENT ---
    let isSortReversed = false;
    let isTrackSortReversed = false; // NEW: global track sort state
    let shortcutFieldOptions = [];
    let lastScrollY = 0; // For mobile header scroll

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
    
    // 反轉搜尋結果
    function toggleSearchTrackSort() {
        isSearchTrackReversed = !isSearchTrackReversed;

        // 找到目前符合搜尋條件且可見的專輯
        const visibleSections = Array.from(albumContainer.querySelectorAll('.album-section:not(.hidden)'));

        visibleSections.forEach(section => {
            const musicGrid = section.querySelector('.music-grid');
            if (!musicGrid) return;

            // 找到目前可見的曲目卡片
            const visibleCards = Array.from(musicGrid.querySelectorAll('.music-card:not(.hidden)'));
            
            // 按照目前設定的反轉狀態切換順序
            visibleCards.reverse();

            // 清空原來 grid，按新的順序塞回去
            visibleCards.forEach(card => musicGrid.appendChild(card));
        });

        searchSortToggle.title = isSearchTrackReversed ? '曲目排序 (反轉)' : '曲目排序 (順序)';
    }

    if (searchSortToggle) {
        searchSortToggle.addEventListener('click', toggleSearchTrackSort);
    }
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
                
                if (!fieldRegexToggle.checked) {
                    const term = searchFieldInput.value.trim().toLowerCase();
                    if (term) {
                        const matchedOption = shortcutFieldOptions.find(opt => opt.keywords.includes(term));
                        if (matchedOption) {
                            searchFieldInput.value = matchedOption.value;
                        }
                    }
                }
                updatePillState();
                
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

    // NEW: Global per-album track sort (reverse order of ALL tracks, ignoring visibility)
    function toggleTrackSort() {
        isTrackSortReversed = !isTrackSortReversed;

        const albumSections = Array.from(albumContainer.querySelectorAll('.album-section'));
        albumSections.forEach(section => {
            const musicGrid = section.querySelector('.music-grid');
            if (!musicGrid) return;
            const cards = Array.from(musicGrid.children);
            cards.reverse().forEach(card => musicGrid.appendChild(card));
        });

        if (trackSortToggle) {
            trackSortToggle.title = isTrackSortReversed ? '曲目排序 (反轉)' : '曲目排序 (正常)';
        }
    }
    if (trackSortToggle) {
        trackSortToggle.addEventListener('click', toggleTrackSort);
    }

    // --- DETAILS SIDEBAR & PLAYER ---
    function showDetails(track, albumId) {
        if (!track || !track.details) {
          return;
        }

        if (leftSidebar && leftSidebar.classList.contains('is-open')) {
            leftSidebar.classList.remove('is-open');
            sidebarBackdrop.classList.remove('is-visible');
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
        if (detailsBackdrop && window.innerWidth <= 768) {
            detailsBackdrop.classList.add('is-visible');
        }
        
        if (window.innerWidth <= 768 && header) {
            header.classList.add('search-hidden');
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
        restorePlayer();
        
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
        closeStickyPlayerBtn.addEventListener('click', minimizePlayer);
    }

    function minimizePlayer() {
        if (stickyPlayer) {
            stickyPlayer.classList.add('is-minimized');
        }
        if (minimizedPlayer) {
            minimizedPlayer.classList.add('is-visible');
        }
    }

    function restorePlayer() {
        if (stickyPlayer) {
            stickyPlayer.classList.remove('is-minimized');
        }
        if (minimizedPlayer) {
            minimizedPlayer.classList.remove('is-visible');
        }
    }


    // --- MOBILE SIDEBAR TOGGLE ---
    if (tocToggleMobile && leftSidebar && sidebarBackdrop) {
        tocToggleMobile.addEventListener("click", () => {
            const isAlreadyOpen = leftSidebar.classList.contains('is-open');

            if (isAlreadyOpen) {
                leftSidebar.classList.remove("is-open");
                sidebarBackdrop.classList.remove("is-visible");
            } else {
                if (detailsSidebar && detailsSidebar.classList.contains('is-open')) {
                    closeDetailsSidebar();
                }
                leftSidebar.classList.add("is-open");
                sidebarBackdrop.classList.add("is-visible");
                if (header) {
                    header.classList.add('search-hidden');
                }
            }
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

                // --- MODIFICATION START ---
                // Only store matched details if a specific query was entered.
                if (cardIsVisible && (fieldQuery || valueQuery)) {
                    card.dataset.matchedDetails = JSON.stringify(matchedData);
                } else {
                    // Otherwise, remove the attribute to ensure 'matched' export is empty.
                    card.removeAttribute('data-matched-details');
                }
                // --- MODIFICATION END ---

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

        document.querySelectorAll('.album-section').forEach(section => {
            const tocLink = toc.querySelector(`a[href="#${section.id}"]`);
            if (tocLink) {
                const isSectionHidden = section.classList.contains('hidden');
                tocLink.classList.toggle('is-inactive', isSectionHidden);
            }
        });
    }
    
    
    
// --- RENDER PAGE & CARDS ---
    function createTrackCard(track, albumId) {
        const card = document.createElement('div');
        card.className = 'music-card';

        let chineseTitle = '';
        let englishTitle = '';
        const fullTitle = track.fullTitle.trim();
        
        // --- MODIFICATION START ---
        // 檢查標題是否包含至少一個中文字符
        const hasChinese = /[\u4e00-\u9fa5]/.test(fullTitle);
        
        if (hasChinese) {
            const regex = /^(.*?)(\s[a-zA-Z].*)?$/;
            const match = fullTitle.match(regex);
            
            if (match && match[2] && !/[\u4e00-\u9fa5]/.test(match[2])) {
                // (情況 A) 分割正確

                chineseTitle = match[1].trim();
                englishTitle = match[2].trim();
            } else {
                // (情況 B) 分割錯誤或無需分割
                chineseTitle = fullTitle;
                englishTitle = '';
            }
        } else {
            // (情況 C) 標題完全不包含中文
            chineseTitle = fullTitle;
            englishTitle = '';
        }
        // --- MODIFICATION END ---
        
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

    // --- PILL-LIKE INPUT MANAGEMENT ---
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
        const multiSelectToggle = document.getElementById('multiSelectToggle');

        const pinnedFieldConfig = { "作曲": { keywords: ["作曲", "composer"], canonical: "Composer / 作曲", originals: new Set(), fixedValue: "作曲 composer" }, "編曲": { keywords: ["编曲", "配器", "编配", "改编", "arranger", "adoption", "orchestrator", "original", "reinterpret"], canonical: "Arranger / 編曲", originals: new Set(), fixedValue: "配器 编曲 编配 改编 Orchestrator Arranger Adoption Reinterpret original" }, "作詞": { keywords: ["作词", "lyric", "lyricist"], canonical: "Lyricist / 作詞", originals: new Set(), fixedValue: "作词 Lyricist" } };
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
                        value: config.fixedValue,
                        simpleText: key,
                        keywords: config.keywords
                    };
                    pinnedOptions.push(optionData);
                    shortcutFieldOptions.push(optionData);
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
                const selectedValue = e.target.value;
                if (!selectedValue) return;

                const multiSelectToggle = document.getElementById('multiSelectToggle');
                if (multiSelectToggle && multiSelectToggle.checked) {
                    const currentVal = searchFieldInput.value.trim();
                    searchFieldInput.value = currentVal ? `${currentVal} ${selectedValue}` : selectedValue;
                } else {
                    searchFieldInput.value = selectedValue;
                }

                fieldRegexToggle.checked = false;
                searchFieldInput.dispatchEvent(new Event('input'));
                e.target.selectedIndex = 0;
                updatePillState();
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

                const newVal = selectedName.includes(' ') ? `"${selectedName}"` : selectedName;

                const multiSelectToggle = document.getElementById('multiSelectToggle');
                if (multiSelectToggle && multiSelectToggle.checked) {
                    const currentVal = searchValueInput.value.trim();
                    searchValueInput.value = currentVal ? `${currentVal} ${newVal}` : newVal;
                } else {
                    searchValueInput.value = newVal;
                }

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
                if (inputEl === searchFieldInput) updatePillState();
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
                    if (activeIndex > -1) {
                        items[activeIndex].dispatchEvent(new Event('mousedown'));
                    }
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
                    if (input === searchFieldInput) updatePillState();
                    input.dispatchEvent(new Event('input'));
                    updateFilter();
                    // NEW: persist clearing of album search
                    if (input === searchInput) {
                        localStorage.setItem('albumSearchQuery', '');
                    }
                    input.focus();
                });
            }
        });
    }

    function setupQuickSearchButtons() {
        document.querySelectorAll('.quick-search-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const q = e.target.dataset.query;
                searchInput.value = q;
                searchInput.dispatchEvent(new Event('input'));
                updateFilter();
                // NEW: persist quick search choice
                localStorage.setItem('albumSearchQuery', q);
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
        if (header) {
            const headerHeight = header.offsetHeight;
            if (window.innerWidth > 768) {
                if (leftSidebar) leftSidebar.style.height = `calc(100vh - ${headerHeight}px)`;
                if (detailsSidebar) detailsSidebar.style.height = `calc(100vh - ${headerHeight}px)`;
            } else {
                if (leftSidebar) leftSidebar.style.height = '';
                if (detailsSidebar) detailsSidebar.style.height = '';
            }
        }
    }


    function handleHeaderScroll() {
        if (window.innerWidth > 768) return; // Only run on mobile
        if (!header) return;
        const currentScrollY = albumContainer.scrollTop;

        if (currentScrollY > lastScrollY && currentScrollY > 50) {
            header.classList.add('search-hidden');
        } else if (currentScrollY < lastScrollY) {
            header.classList.remove('search-hidden');
        }
        lastScrollY = currentScrollY <= 0 ? 0 : currentScrollY;
    }

    function dragElement(elmnt) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        let isDragging = false;
        
        const dragMouseDown = (e) => {
            isDragging = false;
            e = e || window.event;
            e.preventDefault();

            elmnt.style.transition = 'none';

            const rect = elmnt.getBoundingClientRect();
            elmnt.style.top = rect.top + "px";
            elmnt.style.left = rect.left + "px";
            elmnt.style.bottom = 'auto';
            elmnt.style.right = 'auto';

            pos3 = e.clientX || e.touches[0].clientX;
            pos4 = e.clientY || e.touches[0].clientY;
            document.onmouseup = closeDragElement;
            document.ontouchend = closeDragElement;
            document.onmousemove = elementDrag;
            document.ontouchmove = elementDrag;
        }

        const elementDrag = (e) => {
            isDragging = true;
            e = e || window.event;
            const currentX = e.clientX || e.touches[0].clientX;
            const currentY = e.clientY || e.touches[0].clientY;
            pos1 = pos3 - currentX;
            pos2 = pos4 - currentY;
            pos3 = currentX;
            pos4 = currentY;
            
            let newTop = elmnt.offsetTop - pos2;
            let newLeft = elmnt.offsetLeft - pos1;

            const docWidth = document.documentElement.clientWidth;
            const docHeight = document.documentElement.clientHeight;
            const elWidth = elmnt.offsetWidth;
            const elHeight = elmnt.offsetHeight;
            
            if (newLeft < 0) newLeft = 0;
            if (newTop < 0) newTop = 0;
            if (newLeft + elWidth > docWidth) newLeft = docWidth - elWidth;
            if (newTop + elHeight > docHeight) newTop = docHeight - elHeight;
            
            elmnt.style.top = newTop + "px";
            elmnt.style.left = newLeft + "px";
        }

        const closeDragElement = (e) => {
            elmnt.style.transition = ''; 

            if (isDragging) {
                const docWidth = document.documentElement.clientWidth;
                const elWidth = elmnt.offsetWidth;
                const elLeft = elmnt.offsetLeft;
                const midPoint = docWidth / 2;

                if ((elLeft + elWidth / 2) < midPoint) {
                    elmnt.style.left = "1.5rem";
                    elmnt.style.right = "auto";
                } else {
                    const remInPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
                    const finalOffset = 1.5 * remInPx;
                    const targetLeft = docWidth - elWidth - finalOffset;
                    elmnt.style.left = `${targetLeft}px`;
                    elmnt.style.right = "auto";
                }
            }
            
            document.onmouseup = null;
            document.onmousemove = null;
            document.ontouchend = null;
            document.ontouchmove = null;
            
            if (!isDragging) { 
                restorePlayer();
            }
        }
        
        elmnt.onmousedown = dragMouseDown;
        elmnt.ontouchstart = dragMouseDown;
    }
    
    // --- EXPORT FUNCTIONALITY ---
    function setupExportModal() {
        if (!exportBtn || !exportModal || !exportModalClose || !confirmExportBtn) return;

        exportBtn.addEventListener('click', () => {
            const visibleCards = document.querySelectorAll('.music-card:not(.hidden)');
            if (visibleCards.length === 0) {
                alert('沒有可匯出的搜尋結果。');
                return;
            }
            exportModal.style.display = 'flex';
        });

        const closeModal = () => {
            exportModal.style.display = 'none';
        };

        exportModalClose.addEventListener('click', closeModal);
        exportModal.addEventListener('click', (e) => {
            if (e.target === exportModal) {
                closeModal();
            }
        });

        confirmExportBtn.addEventListener('click', handleExport);
    }

function handleExport() {
        // 獲取使用者選擇要匯出的欄位範圍 ('all' 或 'matched')
        const fields = document.querySelector('input[name="exportFields"]:checked').value;
        // 選取所有目前可見的音樂卡片元素
        const visibleCards = document.querySelectorAll('.album-section:not(.hidden) .music-card:not(.hidden)');
        const dataToExport = [];

        visibleCards.forEach(card => {
            // 從卡片的 data-details 屬性解析出完整的曲目資訊
            const fullDetails = card.dataset.details ? JSON.parse(card.dataset.details) : null;
            if (!fullDetails) return; // 如果卡片沒有詳細資訊，則跳過

            let trackData;

            if (fields === 'all') {
                // 如果選擇匯出全部資訊，則直接使用完整的曲目資料
                trackData = { ...fullDetails };
            } else { // 'matched'
                // 如果選擇僅匯出符合篩選的資訊
                const matchedDetails = card.dataset.matchedDetails ? JSON.parse(card.dataset.matchedDetails) : {};
                // 建立一個新物件，確保曲目標題 (track) 永遠被包含，然後再合併符合篩選的欄位
                trackData = {
                    track: fullDetails.track, 
                    ...matchedDetails
                };
            }
            dataToExport.push(trackData);
        });

        if (dataToExport.length === 0) {
            alert('沒有可匯出的資料。');
            return;
        }

        // 準備檔案內容，直接使用 JSON 格式
        const timestamp = new Date().toISOString().slice(0, 10);
        const fileContent = JSON.stringify(dataToExport, null, 2);
        const mimeType = 'application/json';

        // 呼叫下載函式，檔名固定為 .json
        downloadFile(fileContent, `search_results_${timestamp}.json`, mimeType);
        
        // 關閉匯出視窗
        if (exportModal) {
            exportModal.style.display = 'none';
        }
    }

    function downloadFile(content, fileName, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // --- INITIALIZATION ---
    async function initializeApp() {
        try {
            minimizedPlayer = document.createElement('div');
            minimizedPlayer.id = 'minimized-player';
            minimizedPlayer.className = 'minimized-player';
            minimizedPlayer.innerHTML = `<i class="fas fa-play"></i>`;
            document.body.appendChild(minimizedPlayer);
            dragElement(minimizedPlayer);

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
            setupExportModal();
            setupAutocomplete();
            updateLayout(); 
            window.addEventListener('resize', updateLayout);

            // NEW: Restore album search query from localStorage and persist on input
            if (searchInput) {
                const savedAlbumQuery = localStorage.getItem('albumSearchQuery') || '';
                if (savedAlbumQuery) {
                    searchInput.value = savedAlbumQuery;
                }
                searchInput.addEventListener('input', () => {
                    localStorage.setItem('albumSearchQuery', searchInput.value);
                });
            }

            searchFieldInput.addEventListener('focus', () => {
                searchFieldInput.parentElement.classList.remove('is-pilled');
            });
            searchFieldInput.addEventListener('blur', () => {
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

            [searchFieldInput, searchValueInput].forEach(input => {
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        input.blur();
                        document.getElementById('field-suggestions').style.display = 'none';
                        document.getElementById('value-suggestions').style.display = 'none';
                    }
                });
            });

            if (albumContainer) {
                albumContainer.addEventListener('scroll', handleHeaderScroll);
            }

            // NEW: ensure filter runs once on init to apply any restored album query
            updateFilter();

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