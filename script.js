document.addEventListener('DOMContentLoaded', function() {
    // --- DOM ELEMENT SELECTION ---
    const albumContainer = document.getElementById('albumContainer');
    const toc = document.getElementById('toc');
    const searchInput = document.getElementById('searchInput');
    const searchFieldInput = document.getElementById('searchField');
    const searchValueInput = document.getElementById('searchValue');
    const themeToggle = document.getElementById('themeToggle');
    const sortToggle = document.getElementById('sortToggle');
    const detailsSidebar = document.getElementById('details-sidebar');
    const sidebarContent = document.getElementById('sidebar-content');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const stickyPlayer = document.getElementById('sticky-player');
    const stickyPlayerContent = document.getElementById('sticky-player-content');
    const closeStickyPlayerBtn = document.getElementById('close-sticky-player-btn');
    const shortcutFieldSelect = document.getElementById('shortcutField');
    const leftSidebar = document.querySelector('.sidebar');
    const leftResizer = document.getElementById('left-resizer');
    const rightResizer = document.getElementById('right-resizer');
    const tocCollapseToggle = document.getElementById('tocCollapseToggle');
    const collapsibleTocContent = document.getElementById('collapsibleTocContent');
    const tocToggleMobile = document.getElementById("tocToggleMobile");
    const sidebarBackdrop = document.getElementById("sidebar-backdrop");
    const detailsBackdrop = document.getElementById("details-backdrop");

    // --- STATE MANAGEMENT ---
    let isSortReversed = false;

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

    function loadPlayer(id) {
        if (!stickyPlayer || !stickyPlayerContent) return;
        const playerHtml = `
            <iframe frameborder="0" border="0" marginwidth="0" marginheight="0" width="100%" height="86"
                src="https://music.163.com/outchain/player?type=2&id=${id}&auto=1&height=66">
            </iframe>`;
        stickyPlayerContent.innerHTML = playerHtml;
        stickyPlayer.classList.add('is-visible');
    }

    if (detailsSidebar) {
        detailsSidebar.addEventListener('click', (e) => {
            if (e.target.classList.contains('load-player-btn')) {
                loadPlayer(e.target.dataset.id);
            }
        });
    }

    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', () => {
            detailsSidebar.classList.remove('is-open');
            if (detailsBackdrop) {
                detailsBackdrop.classList.remove('is-visible');
            }
        });
    }

    if (detailsBackdrop) {
        detailsBackdrop.addEventListener('click', () => {
            detailsSidebar.classList.remove('is-open');
            detailsBackdrop.classList.remove('is-visible');
        });
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
            leftSidebar.classList.toggle("is-open");
            sidebarBackdrop.classList.toggle("is-visible");
        });
        sidebarBackdrop.addEventListener("click", () => {
            leftSidebar.classList.remove("is-open");
            sidebarBackdrop.classList.remove("is-visible");
        });
    }

    // --- SEARCH & FILTERING ---
    function checkAdvancedQuery(details, fieldQuery, valueQuery) {
        if (!valueQuery.trim()) return true;
        if (!details) return false;
        
        const valueQueryLower = valueQuery.toLowerCase();
        
        // 抓取所有用雙引號包裹的精確詞組
        const exactMatches = (valueQueryLower.match(/"[^"]+"/g) || []).map(m => m.slice(1, -1));
        
        // 移除已處理的詞組，並將剩餘的詞彙按空格分割
        const remainingQuery = valueQueryLower.replace(/"[^"]+"/g, '').trim();
        const keywords = remainingQuery.split(/\s+/).filter(k => k);

        const allTerms = [...exactMatches, ...keywords];
        if (allTerms.length === 0) return true;

        const checkValueMatch = (text, terms) => {
            return terms.every(term => text.includes(term));
        };
        
        if (!fieldQuery.trim()) {
            const entireRecord = Object.values(details).map(v => String(v).toLowerCase()).join(' ');
            return checkValueMatch(entireRecord, allTerms);
        } else {
            const fields = fieldQuery.toLowerCase().split(' ').filter(f => f);
            const searchCorpus = Object.entries(details)
                .filter(([key]) => fields.some(f => key.toLowerCase().includes(f)))
                .map(([, val]) => String(val).toLowerCase()).join(' ');

            if (valueQuery.trim() === '*') {
                return searchCorpus.length > 0;
            }

            return checkValueMatch(searchCorpus, allTerms);
        }
    }

    function updateFilter() {
        const generalQuery = searchInput.value.toLowerCase().trim();
        const fieldQuery = searchFieldInput.value.trim();
        const valueQuery = searchValueInput.value.trim();

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
                const cardIsVisible = checkAdvancedQuery(details, fieldQuery, valueQuery);
                
                card.classList.toggle('hidden', !cardIsVisible);
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

        const titleRegex = /^([\u4e00-\u9fa5].*?)\s+([a-zA-Z].*)$/;
        const match = fullTitle.match(titleRegex);
        
        if (match && match[1] && match[2]) {
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

    // --- SHORTCUTS & SEARCH SETUP ---
    async function setupShortcuts(fieldKeys) {
        const pinnedFieldConfig = {
            "作曲": { keywords: ["作曲"], canonical: "作曲 / Composer", originals: new Set(), searchTerms: "作曲 Composer" },
            "編曲": { keywords: ["编曲", "配器", "编配", "改编", "原编曲", "original"], canonical: "編曲 / Arranger", originals: new Set(), searchTerms: "编曲 配器 改编 Arranger orchestrator Adoption" },
            "作詞": { keywords: ["作词", "lyric"], canonical: "作詞 / Lyricist", originals: new Set(), searchTerms: "作词 Lyricist" }
        };
        const pinnedOrder = ["作曲", "編曲", "作詞"];

        const fieldGroups = new Map();
        const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

        fieldKeys.forEach(key => {
            if (!key) return;
            const chineseMatch = key.match(/[\u4e00-\u9fa5]+/g);
            const englishMatch = key.match(/[a-zA-Z0-9][a-zA-Z0-9 -]*/g);
            const chinesePart = chineseMatch ? chineseMatch.join('').trim() : '';
            const englishPart = englishMatch ? englishMatch.join(' ').trim() : '';
            
            let canonicalName = key;
            let searchTerms = key;

            // 處理複合中英文詞彙，例如 "Additional Strings / 附加弦乐"
            if (chinesePart && englishPart) {
                if (key.includes('/')) {
                    canonicalName = `${englishPart} / ${chinesePart}`;
                    searchTerms = `"${englishPart}" ${chinesePart}`;
                } else {
                    // 處理 "电吉他Electric Guitar" 這種沒有空格的複合詞彙
                    canonicalName = `${englishPart} / ${chinesePart}`;
                    searchTerms = `${chinesePart} "${englishPart}"`;
                }
            } else {
                // 如果是單純的中英文詞彙
                const words = key.split(' ').filter(word => word);
                if (words.length > 1) {
                    searchTerms = `"${key}"`;
                }
            }

            // 檢查是否為固定欄位
            let isPinned = false;
            for (const config of Object.values(pinnedFieldConfig)) {
                if (config.keywords.some(kw => key.includes(kw))) {
                    config.originals.add(key);
                    isPinned = true;
                    break;
                }
            }
            if (isPinned) return;

            // 分組並加入到 map
            if (!fieldGroups.has(canonicalName)) {
                fieldGroups.set(canonicalName, { searchTerms: new Set(), originalKeys: new Set() });
            }
            fieldGroups.get(canonicalName).searchTerms.add(searchTerms);
            fieldGroups.get(canonicalName).originalKeys.add(key);
        });

        if (shortcutFieldSelect) {
            shortcutFieldSelect.innerHTML = '<option value="">快捷輸入欄位</option>';
            pinnedOrder.forEach(key => {
                const config = pinnedFieldConfig[key];
                if (config.originals.size > 0) {
                    const option = document.createElement('option');
                    option.value = config.searchTerms;
                    option.textContent = config.canonical;
                    shortcutFieldSelect.appendChild(option);
                }
            });

            const sortedRegularKeys = [...fieldGroups.keys()].sort((a, b) => a.localeCompare(b));
            sortedRegularKeys.forEach(canonical => {
                if (canonical.match(/track|album|date/i)) return;
                const option = document.createElement('option');
                const terms = [...fieldGroups.get(canonical).searchTerms].join(' ');
                option.value = terms;
                option.textContent = canonical;
                shortcutFieldSelect.appendChild(option);
            });
            
            shortcutFieldSelect.addEventListener('change', (e) => {
                if (!e.target.value) return;
                searchFieldInput.value = e.target.value;
                searchFieldInput.dispatchEvent(new Event('input'));
                e.target.selectedIndex = 0;
                updateFilter();
            });
        }

        const personnelSelect = document.getElementById('shortcutPersonnel');
        if (personnelSelect) {
            try {
                const response = await fetch('personnel.json');
                if (!response.ok) {
                    throw new Error(`HTTP 錯誤！狀態: ${response.status}`);
                }
                const personnel = await response.json();
                personnel.forEach(name => personnelSelect.appendChild(new Option(name, name)));
            } catch (error) {
                console.error('無法載入或解析 personnel.json:', error);
                personnelSelect.style.display = 'none';
            }
            
            personnelSelect.addEventListener('change', (e) => {
                if (!e.target.value) return;
                searchValueInput.value = searchValueInput.value.trim() ? `${searchValueInput.value.trim()} ${e.target.value}` : e.target.value;
                searchValueInput.dispatchEvent(new Event('input'));
                e.target.value = "";
                updateFilter();
            });
        }
    }

    function setupClearButtons() {
        const fields = [
            { input: searchInput, btn: document.getElementById('clearSearchInput') },
            { input: searchFieldInput, btn: document.getElementById('clearSearchField') },
            { input: searchValueInput, btn: document.getElementById('clearSearchValue') },
        ];

        fields.forEach(({ input, btn }) => {
            if (btn) {
                btn.addEventListener('click', () => {
                    input.value = '';
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
    
    // --- RESIZER LOGIC ---
    function setupResizers() {
        let isResizing = false;

        function onMouseDown(e, element, direction) {
            isResizing = true;
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'ew-resize';
            
            function onMouseMove(e) {
                if (!isResizing) return;
                const mainContent = document.querySelector('.main-content');
                const pageContainerWidth = document.querySelector('.page-container').offsetWidth;
                let newWidth;

                if (direction === 'left') {
                    newWidth = e.clientX;
                    element.style.width = `${newWidth}px`;
                    mainContent.style.flexBasis = `calc(${pageContainerWidth - newWidth - detailsSidebar.offsetWidth}px)`;
                } else if (direction === 'right') {
                    newWidth = pageContainerWidth - e.clientX;
                    element.style.width = `${newWidth}px`;
                    mainContent.style.flexBasis = `calc(${pageContainerWidth - newWidth - leftSidebar.offsetWidth}px)`;
                }
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

        if (leftResizer && leftSidebar) {
            leftResizer.addEventListener('mousedown', (e) => onMouseDown(e, leftSidebar, 'left'));
        }
        if (rightResizer && detailsSidebar) {
            rightResizer.addEventListener('mousedown', (e) => onMouseDown(e, detailsSidebar, 'right'));
        }
    }
    
    // --- SCROLL SPY ---
    function setupScrollSpy() {
        const sections = document.querySelectorAll('.album-section');
        if (sections.length === 0) return;

        const observerCallback = (entries) => {
            entries.forEach(entry => {
                const link = toc.querySelector(`a[href="#${entry.target.id}"]`);
                if (link) {
                    link.dataset.visible = entry.isIntersecting;
                }
            });

            const firstVisibleLink = Array.from(toc.querySelectorAll('a')).find(link => link.dataset.visible === 'true');
            const currentActiveLink = toc.querySelector('.active-toc-link');

            if (firstVisibleLink && firstVisibleLink !== currentActiveLink) {
                if (currentActiveLink) {
                    currentActiveLink.classList.remove('active-toc-link');
                }
                firstVisibleLink.classList.add('active-toc-link');
                
                firstVisibleLink.scrollIntoView({ behavior: 'auto', block: 'nearest' });
            } else if (!currentActiveLink && toc.children.length > 0) {
                const firstTocLink = toc.querySelector('a');
                if(firstTocLink) {
                    firstTocLink.classList.add('active-toc-link');
                }
            }
        };

        const observer = new IntersectionObserver(observerCallback, {
            root: albumContainer,
            threshold: 0.1,
            rootMargin: '0px 0px -25% 0px'
        });

        sections.forEach(section => observer.observe(section));
    }
    
    // --- TOC CLICK HANDLER ---
    function setupTocClickHandler() {
        if (!toc) return;
        toc.addEventListener('click', function(e) {
            if (e.target.tagName === 'A') {
                e.preventDefault(); 

                const currentActiveLink = toc.querySelector('.active-toc-link');
                if (currentActiveLink) {
                    currentActiveLink.classList.remove('active-toc-link');
                }

                const clickedLink = e.target;
                clickedLink.classList.add('active-toc-link');

                const targetId = clickedLink.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView();
                }
            }
        });
    }

    // --- INITIALIZATION ---
    async function initializeApp() {
        try {
            const idMap = new Map();
            const idManifestResponse = await fetch('IDs/manifest.json');
            const idManifest = await idManifestResponse.json();
            const idFilePromises = idManifest.albums.map(filename =>
                fetch(`IDs/${filename}`).then(res => res.text())
            );
            
            const normalizeTitle = (title) => {
                if (!title) return '';
                return title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');
            };

            const idFiles = await Promise.allSettled(idFilePromises);
            idFiles.forEach(result => {
                if (result.status === 'fulfilled') {
                    result.value.trim().split('\n').forEach(line => {
                        const parts = line.split('\t');
                        if (parts.length >= 2) {
                          const normalizedTrackName = normalizeTitle(parts[1]);
                          if (normalizedTrackName) {
                            idMap.set(normalizedTrackName, parts[0].trim());
                          }
                        }
                    });
                }
            });

            const dataIndexResponse = await fetch('data/data.json');
            const dataIndex = await dataIndexResponse.json();

            const allFilePaths = [];
            for (const game in dataIndex) {
                if (dataIndex.hasOwnProperty(game)) {
                    allFilePaths.push(...dataIndex[game]);
                }
            }

            const detailPromises = allFilePaths.map(file => fetch(`data/${file}`).then(res => res.json()));
            const settledDetails = await Promise.allSettled(detailPromises);
            
            const fieldKeys = new Set();
            const allAlbumData = settledDetails
                .filter(result => result.status === 'fulfilled')
                .flatMap(result => result.value) 
                .map(albumData => {
                    const tracks = albumData.tracks.map(trackDetail => {
                        const fullTitle = trackDetail.track;
                        const normalizedFullTitle = normalizeTitle(fullTitle);
                        Object.keys(trackDetail).forEach(key => fieldKeys.add(key));
                        return {
                            id: idMap.get(normalizedFullTitle) || null,
                            fullTitle: fullTitle,
                            details: trackDetail
                        };
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

        } catch (error) {
            if (albumContainer) {
                albumContainer.innerHTML = `<p style="color: red; text-align: center;">初始化失敗: ${error.message}</p>`;
            }
            console.error("Initialization Error:", error);
        }
    }

    [searchInput, searchFieldInput, searchValueInput].forEach(el => {
        if (el) {
            el.addEventListener('input', updateFilter);
        }
    });
    
    initializeApp();
});