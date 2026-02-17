import os
import json
import re
import hashlib
import difflib
import datetime
import subprocess
from mutagen.flac import FLAC
from mutagen.mp3 import MP3
from mutagen.easyid3 import EasyID3
from mutagen.id3 import ID3, USLT

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DIFF_DIR = os.path.join(SCRIPT_DIR, "diffs")

def extract_info_from_lyrics(lyrics):
    info = {}
    timestamp_pattern = r'\[(?:\d{2}:\d{2}(?:\.\d{2,3})?|\d{2}:\d{2}:\d{2}(?:\.\d{2,3})?|\d{2}:\d{2}\.\d{2,3}-\d+)\]'
    bracket_pattern = r'\[\s*([^:]+?)\s*:\s*([^\]]*)\]'
    kv_pattern = r'^\s*([^:]+?)\s*[:：]\s*(.*)'
    exceptions = [
        "在抵达之前选择", "ti", "ar", "al", "by", "offset",
        "不乱不破 (《崩坏", "language", "id", "Nameless Faces (《崩坏",
        "何者 (《崩坏", "不眠之夜 (《崩坏", "M", "W", "男", "女", "Men",
        "永火一夜", "花火",
        "炽烈的还魂诗·众灵颂 Ode of Resurrection",
        "炽烈的还魂诗·节录 Ode of Resurrection",
        "炽烈的还魂诗·再现 Ode of Resurrection",
        "石心誓环•天平两端 Stoneheart's Oath Ring"
    ]
    exception_keywords = ["炽烈的还魂诗", "崩坏", "新月的摇篮曲"]

    remove_angle_brackets = re.compile(r'<[^>]*>')

    def contains_chinese(text):
        return bool(re.search(r'[\u4e00-\u9fff]', text))

    for line in lyrics.split('\n'):
        line = re.sub(timestamp_pattern, '', line).strip()
        line = remove_angle_brackets.sub('', line).strip()
        if not line:
            continue
        bracket_match = re.match(bracket_pattern, line)
        if bracket_match:
            key = bracket_match.group(1).strip()
            value = bracket_match.group(2).strip()
        else:
            kv_match = re.match(kv_pattern, line)
            if kv_match:
                key = kv_match.group(1).strip()
                value = kv_match.group(2).strip()
            else:
                continue
        if key and value:
            if key.lower() in (e.lower() for e in exceptions):
                continue
            if any(kw in key or kw in value for kw in exception_keywords):
                continue
            if contains_chinese(key) or ':' in line:
                info[key] = value
    return info

def process_flac_file(file_path):
    try:
        audio = FLAC(file_path)
        track_info = {"track": audio.get("title", ["Unknown Title"])[0]}
        lyrics = None
        if audio.tags:
            if "UNSYNCED LYRICS" in audio.tags:
                lyrics = audio["UNSYNCED LYRICS"][0]
            elif "LYRICS" in audio.tags:
                lyrics = audio["LYRICS"][0]
        if lyrics:
            lyrics_info = extract_info_from_lyrics(lyrics)
            if "作曲" in lyrics_info:
                composer = lyrics_info.pop("作曲")
                track_info["作曲"] = composer
            track_info.update(lyrics_info)
        return track_info
    except Exception as e:
        print(f"Error processing {file_path}: {str(e)}")
        return None

def process_mp3_file(file_path):
    try:
        audio = MP3(file_path, ID3=EasyID3)
        track_info = {"track": audio.get("title", ["Unknown Title"])[0]}
        lyrics = None
        id3 = ID3(file_path)
        uslt_tags = id3.getall('USLT')
        if uslt_tags:
            lyrics = "\n".join(tag.text for tag in uslt_tags)
        if lyrics:
            lyrics_info = extract_info_from_lyrics(lyrics)
            if "作曲" in lyrics_info:
                composer = lyrics_info.pop("作曲")
                track_info["作曲"] = composer
            track_info.update(lyrics_info)
        return track_info
    except Exception as e:
        print(f"Error processing {file_path}: {str(e)}")
        return None

def process_album_folder(folder_path):
    albums = {}
    track_files = []
    for root, dirs, files in os.walk(folder_path):
        for file in files:
            if file.lower().endswith(('.flac', '.mp3')):
                file_path = os.path.join(root, file)
                try:
                    if file.lower().endswith('.flac'):
                        audio = FLAC(file_path)
                    else:
                        audio = MP3(file_path, ID3=EasyID3)
                except Exception as e:
                    print(f"Error reading {file_path}: {e}")
                    continue
                discnumber = 1
                tracknumber = 1
                if 'discnumber' in audio:
                    try:
                        discnumber = int(str(audio['discnumber'][0]).split('/')[0])
                    except:
                        pass
                if 'tracknumber' in audio:
                    try:
                        tracknumber = int(str(audio['tracknumber'][0]).split('/')[0])
                    except:
                        pass
                track_files.append((discnumber, tracknumber, file_path))
    track_files.sort(key=lambda x: (x[0], x[1]))

    # Determine which albums have multiple discs
    album_disc_counts = {}
    for discnumber, tracknumber, file_path in track_files:
        if file_path.lower().endswith('.flac'):
            audio = FLAC(file_path)
        else:
            audio = MP3(file_path, ID3=EasyID3)
        album_name = audio.get("album", ["Unknown Album"])[0]
        if album_name not in album_disc_counts:
            album_disc_counts[album_name] = set()
        album_disc_counts[album_name].add(discnumber)

    for discnumber, tracknumber, file_path in track_files:
        if file_path.lower().endswith('.flac'):
            track_info = process_flac_file(file_path)
            audio = FLAC(file_path)
        else:
            track_info = process_mp3_file(file_path)
            audio = MP3(file_path, ID3=EasyID3)
        if track_info:
            album_name = audio.get("album", ["Unknown Album"])[0]
            if album_name not in albums:
                albums[album_name] = {
                    "album": album_name,
                    "date": audio.get("date", ["Unknown Date"])[0],
                    "tracks": []
                }
            # Include disc number only if the album has multiple discs
            if len(album_disc_counts.get(album_name, set())) > 1:
                track_info["cd"] = discnumber
            albums[album_name]["tracks"].append(track_info)
    return list(albums.values())

def build_data_index(base_data_dir, root_folders):
    index = {}
    for game_name in root_folders.keys():
        game_dir = os.path.join(base_data_dir, game_name)
        if not os.path.isdir(game_dir):
            continue
        index[game_name] = []
        for file in os.listdir(game_dir):
            if file.endswith(".json") and file != "data.json":
                rel_path = f"{game_name}/{file}"
                index[game_name].append(rel_path)
    return index

def compute_hash(data):
    return hashlib.md5(json.dumps(data, sort_keys=True, ensure_ascii=False).encode("utf-8")).hexdigest()

def save_diff(old_data, new_data, diff_path):
    old_text = json.dumps(old_data, ensure_ascii=False, indent=2).splitlines(keepends=True)
    new_text = json.dumps(new_data, ensure_ascii=False, indent=2).splitlines(keepends=True)
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    diff_lines = list(difflib.unified_diff(old_text, new_text, fromfile="old", tofile="new", lineterm=""))
    os.makedirs(os.path.dirname(diff_path), exist_ok=True)
    with open(diff_path, "w", encoding="utf-8") as f:
        f.write(f"# 更新時間: {timestamp}\n")
        f.writelines(diff_lines)

def git_commit_and_push(repo_dir, message):
    try:
        subprocess.run(["git", "-C", repo_dir, "add", "."], check=True)
        subprocess.run(["git", "-C", repo_dir, "commit", "-m", message], check=True)
        subprocess.run(["git", "-C", repo_dir, "push"], check=True)
        print(f"\n✅ Git commit & push 成功: {message}")
    except subprocess.CalledProcessError as e:
        print(f"❌ Git 操作失敗: {e}")

def manage_version_and_git(base_data_dir, added_count, updated_count, skipped_count):
    version_file = os.path.join(SCRIPT_DIR, "version.txt")
    if not os.path.isfile(version_file):
        with open(version_file, "w", encoding="utf-8") as vf:
            vf.write("0.0.0")
    with open(version_file, "r", encoding="utf-8") as vf:
        current_version = vf.read().strip()
    print(f"\n📌 目前版本號: {current_version}")
    new_version = input("請輸入新的版本號: ").strip()
    if new_version:
        with open(version_file, "w", encoding="utf-8") as vf:
            vf.write(new_version)
        commit_message = f"updated v{new_version} (added:{added_count} updated:{updated_count})"
        git_commit_and_push(os.path.dirname(base_data_dir), commit_message)
    else:
        print("⚠️ 未輸入新版本號，跳過 Git commit & push。")

def main():
    root_folders = {
        "原神": 'D:/Music/原神',
        "星穹鐵道": 'D:/Music/星穹鐵道'
    }
    base_data_dir = r"C:\\Files\\Codes\\2025\\HYM site\\netease_playlist\\data"
    os.makedirs(base_data_dir, exist_ok=True)

    # === 例外名單 ===
    EXCLUDED_ALBUMS = [
        "原神/原神-36回家的路 The Long Way Home.json"
    ]

    force_rebuild = input("是否強制重建所有 JSON？(y/N): ").strip().lower() == 'y'
    added_count = 0
    skipped_count = 0
    updated_count = 0

    for game_name, root_folder in root_folders.items():
        game_dir = os.path.join(base_data_dir, game_name)
        os.makedirs(game_dir, exist_ok=True)
        for album_folder in os.listdir(root_folder):
            album_path = os.path.join(root_folder, album_folder)
            if not os.path.isdir(album_path):
                continue
            safe_album_name = album_folder.replace('/', '_').replace('\\', '_')
            output_relative_path = f"{game_name}/{safe_album_name}.json"
            output_file_path = os.path.join(base_data_dir, output_relative_path)

            # === 檢查例外名單 ===
            if output_relative_path in EXCLUDED_ALBUMS:
                print(f"[{game_name}] 跳過例外專輯：{album_folder}")
                skipped_count += 1
                continue

            albums_data = process_album_folder(album_path)
            if os.path.isfile(output_file_path):
                with open(output_file_path, "r", encoding="utf-8") as f:
                    old_data = json.load(f)
                if force_rebuild or compute_hash(old_data) != compute_hash(albums_data):
                    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
                    diff_file_name = f"{game_name}_{safe_album_name}_{timestamp}.diff"
                    diff_file_path = os.path.join(DIFF_DIR, diff_file_name)
                    save_diff(old_data, albums_data, diff_file_path)
                    with open(output_file_path, 'w', encoding='utf-8') as f:
                        json.dump(albums_data, f, ensure_ascii=False, indent=2)
                    print(f"[{game_name}] 更新專輯：{album_folder} → diff 已寫入 {diff_file_path}")
                    updated_count += 1
                else:
                    skipped_count += 1
            else:
                with open(output_file_path, 'w', encoding='utf-8') as f:
                    json.dump(albums_data, f, ensure_ascii=False, indent=2)
                print(f"[{game_name}] 新增專輯：{album_folder}")
                added_count += 1

    data_json_path = os.path.join(base_data_dir, "data.json")
    new_index = build_data_index(base_data_dir, root_folders)
    with open(data_json_path, 'w', encoding='utf-8') as f:
        json.dump(new_index, f, ensure_ascii=False, indent=2)

    print(f"\n索引已更新：{data_json_path}")
    print(f"本次新增：{added_count}，更新：{updated_count}，跳過：{skipped_count}")
    manage_version_and_git(base_data_dir, added_count, updated_count, skipped_count)

if __name__ == "__main__":
    main()
