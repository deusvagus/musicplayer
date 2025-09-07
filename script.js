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
    
    // --- STATE MANAGEMENT ---
    let isSortReversed = false;
    
    // --- THEME MANAGEMENT ---
    function applyTheme(theme) {
        document.body.className = theme === 'light' ? 'light-theme' : 'dark-theme';
        themeToggle.querySelector('i').className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }
    function toggleTheme() {
        const newTheme = document.body.classList.contains('light-theme') ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    }
    themeToggle.addEventListener('click', toggleTheme);
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
    sortToggle.addEventListener('click', toggleAlbumSort);
    
    // --- DETAILS SIDEBAR & PLAYER ---
    function showDetails(track, albumId) {
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
    }

    function loadPlayer(id) {
        const playerHtml = `
            <iframe frameborder="0" border="0" marginwidth="0" marginheight="0" width="100%" height="86"
                src="https://music.163.com/outchain/player?type=2&id=${id}&auto=1&height=66">
            </iframe>`;
        stickyPlayerContent.innerHTML = playerHtml;
        stickyPlayer.classList.add('is-visible');
    }

    detailsSidebar.addEventListener('click', (e) => {
        if (e.target.classList.contains('load-player-btn')) {
            loadPlayer(e.target.dataset.id);
        }
    });
    
    closeSidebarBtn.addEventListener('click', () => detailsSidebar.classList.remove('is-open'));
    closeStickyPlayerBtn.addEventListener('click', () => {
        stickyPlayer.classList.remove('is-visible');
        stickyPlayerContent.innerHTML = '';
    });
    
    // --- SHORTCUTS & SEARCH SETUP ---
    async function setupShortcuts(fieldKeys) {
        const pinnedFieldConfig = {
            "作曲": { keywords: ["作曲", "曲"], canonical: "作曲 / Composer", originals: new Set(), searchTerms: "作曲 Composer" },
            "編曲": { keywords: ["编曲", "配器", "编配", "改编", "原编曲", "original"], canonical: "編曲 / Arranger", originals: new Set(), searchTerms: "编曲 配器 改编 Arranger orchestrator Adoption" },
            "作詞": { keywords: ["作词", "lyric", "词"], canonical: "作詞 / Lyricist", originals: new Set(), searchTerms: "作词 Lyricist" }
        };
        const pinnedOrder = ["作曲", "編曲", "作詞"];

        const fieldGroups = new Map();
        const chineseToCanonical = new Map();
        const englishToCanonical = new Map();
        const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

        fieldKeys.forEach(key => {
            if (!key) return;
            const subFields = key.split('/').map(f => f.trim()).filter(f => f);

            subFields.forEach(field => {
                const mixedParts = field.match(/([\u4e00-\u9fa5]+|[a-zA-Z0-9 -]+)/g) || [];
                const chinesePart = mixedParts.filter(p => /[\u4e00-\u9fa5]/.test(p)).join('').trim();
                let englishPartRaw = mixedParts.filter(p => /[a-zA-Z0-9]/.test(p)).join(' ').trim();
                englishPartRaw = englishPartRaw.split(' ').filter(word => word.length > 1 || !/^[a-zA-Z]$/.test(word)).join(' ');
                
                const englishPart = englishPartRaw.toLowerCase();
                if (!chinesePart && !englishPart) return;

                let isPinned = false;
                for (const config of Object.values(pinnedFieldConfig)) {
                    if (config.keywords.some(kw => kw === field || (chinesePart && kw.includes(chinesePart)) || (englishPart && kw.includes(englishPart)))) {
                        config.originals.add(field);
                        isPinned = true;
                        break;
                    }
                }
                if (isPinned) return;

                let canonical = (chinesePart ? chineseToCanonical.get(chinesePart) : null) || (englishPart ? englishToCanonical.get(englishPart) : null);

                if (!canonical) {
                    const displayParts = [];
                    if (chinesePart) {
                        displayParts.push(chinesePart);
                    }
                    if (englishPartRaw) {
                        displayParts.push(englishPartRaw);
                    }
                    canonical = displayParts.filter(Boolean).join(' / ');
                }

                if (!fieldGroups.has(canonical)) {
                    fieldGroups.set(canonical, new Set());
                }
                fieldGroups.get(canonical).add(field);

                if (chinesePart) chineseToCanonical.set(chinesePart, canonical);
                if (englishPart) englishToCanonical.set(englishPart, canonical);
            });
        });

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

        const sortedRegularKeys = [...fieldGroups.keys()].sort((a, b) => {
            const aEnglish = a.split(' / ')[1] || a;
            const bEnglish = b.split(' / ')[1] || b;
            return aEnglish.localeCompare(bEnglish);
        });

        sortedRegularKeys.forEach(canonical => {
            if (canonical.match(/track|album|date/i)) return;
            const option = document.createElement('option');
            
            // MODIFIED: Generate search terms with correct formatting and quotes
            const parts = canonical.split(' / ');
            let chinesePart = parts[0];
            let englishPart = parts[1];

            // Handle cases where there's only one part
            if (!englishPart && chinesePart.match(/[a-zA-Z]/)) {
                englishPart = chinesePart;
                chinesePart = '';
            }
            if (!chinesePart && englishPart && englishPart.match(/[\u4e00-\u9fa5]/)) {
                chinesePart = englishPart;
                englishPart = '';
            }

            let valueString = '';
            if (chinesePart) {
                valueString += chinesePart;
            }
            if (englishPart) {
                const quotedEnglishPart = englishPart.includes(' ') ? `"${englishPart}"` : englishPart;
                if (valueString) {
                    valueString += ` ${quotedEnglishPart}`;
                } else {
                    valueString = quotedEnglishPart;
                }
            }

            option.value = valueString.trim();
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

        const personnelSelect = document.getElementById('shortcutPersonnel');
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

    function setupClearButtons() {
        const fields = [
            { input: searchInput, btn: document.getElementById('clearSearchInput') },
            { input: searchFieldInput, btn: document.getElementById('clearSearchField') },
            { input: searchValueInput, btn: document.getElementById('clearSearchValue') },
        ];

        fields.forEach(({ input, btn }) => {
            btn.addEventListener('click', () => {
                input.value = '';
                input.dispatchEvent(new Event('input'));
                updateFilter();
                input.focus();
            });
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
            albumContainer.innerHTML = `<p style="color: red; text-align: center;">初始化失敗: ${error.message}</p>`;
            console.error("Initialization Error:", error);
        }
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

    // --- TOC CLICK HANDLER ---
    function setupTocClickHandler() {
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
    
    // --- FILTERING LOGIC ---
    function checkAdvancedQuery(details, fieldQuery, valueQuery) {
        if (!valueQuery.trim()) return true;
        if (!details) return false;
        
        const values = Object.values(details).map(v => String(v).toLowerCase());
        const valueQueryLower = valueQuery.toLowerCase();
        
        const valueKeywords = [];
        const fullTextRegex = /"([^"]+)"|(\S+)/g;
        let match;

        while ((match = fullTextRegex.exec(valueQueryLower)) !== null) {
            if (match[1]) {
                valueKeywords.push({ type: 'exact', value: match[1] });
            } else if (match[2]) {
                valueKeywords.push({ type: 'fuzzy', value: match[2] });
            }
        }
        
        const checkValueMatch = (text, keywords) => {
            return keywords.every(keyword => {
                if (keyword.type === 'exact') {
                    return text.includes(keyword.value);
                } else {
                    return text.includes(keyword.value);
                }
            });
        };
        
        if (!fieldQuery.trim()) {
            const entireRecord = values.join(' ');
            return checkValueMatch(entireRecord, valueKeywords);
        } else {
            const fields = fieldQuery.toLowerCase().split(' ').filter(f => f);
            const searchCorpus = Object.entries(details)
                .filter(([key]) => fields.some(f => key.toLowerCase().includes(f)))
                .map(([, val]) => String(val).toLowerCase()).join(' ');

            if (valueQuery.trim() === '*') {
                return searchCorpus.length > 0;
            }
            
            return checkValueMatch(searchCorpus, valueKeywords);
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

      leftResizer.addEventListener('mousedown', (e) => onMouseDown(e, leftSidebar, 'left'));
      rightResizer.addEventListener('mousedown', (e) => onMouseDown(e, detailsSidebar, 'right'));
    }

    [searchInput, searchFieldInput, searchValueInput].forEach(el => el.addEventListener('input', updateFilter));
    
    initializeApp();
});