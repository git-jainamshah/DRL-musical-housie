#!/bin/bash
# DRL Musical Housie — Audio Download Script
# Run this from the project root:  bash download_audio.sh
#
# Requirements:
#   brew install yt-dlp ffmpeg
#
# Songs are saved as .m4a into the audio/ directory, replacing any existing files.

set -e

AUDIO_DIR="$(dirname "$0")/audio"
mkdir -p "$AUDIO_DIR"

download() {
  local num="$1" file="$2" url="$3" title="$4"
  printf "Downloading %02d — %s ... " "$num" "$title"
  yt-dlp -x --audio-format m4a --audio-quality 0 \
    -o "$AUDIO_DIR/${file}.%(ext)s" \
    "$url" \
    --no-playlist --quiet --no-warnings --force-overwrites
  echo "done"
}

download  1  "01-lag-jaa-gale"          "https://www.youtube.com/watch?v=DFbbpMD3taw"  "Lag Ja Gale"
download  2  "02-roop-tera-mastana"      "https://www.youtube.com/watch?v=dyEdcOhxJNQ"  "Roop Tera Mastana"
download  3  "03-pal-pal-dil-ke-paas"   "https://www.youtube.com/watch?v=AMuRRXCuy-4"  "Pal Pal Dil Ke Paas"
download  4  "04-chura-liya-hai-tumne"  "https://www.youtube.com/watch?v=seFeZOgyFsc"   "Chura Liya Hai Tumne"
download  5  "05-dum-maaro-dum"         "https://www.youtube.com/watch?v=kOrRYDJ4AuY"   "Dum Maaro Dum"
download  6  "06-mere-sapnon-ki-rani"   "https://www.youtube.com/watch?v=UlWAjd9bcKw"   "Mere Sapnon Ki Rani"
download  7  "07-ye-dosti-hum-nahin"    "https://www.youtube.com/watch?v=wFAU_duK0Jc"   "Ye Dosti Hum Nahin"
download  8  "08-ek-do-teen"            "https://www.youtube.com/watch?v=MS5BLS2sIDM"   "Ek Do Teen"
download  9  "09-tujhe-dekha-to"        "https://www.youtube.com/watch?v=cNV5hLSa9H8"   "Tujhe Dekha To"
download 10  "10-pehla-nasha"           "https://www.youtube.com/watch?v=SBfPs-PMGTA"   "Pehla Nasha"
download 11  "11-aaj-kal-tere-mere-pyar" "https://www.youtube.com/watch?v=ulEiyaxHx4s"  "Aaj Kal Tere Mere Pyar"
download 12  "12-gulabi-aankhen"        "https://www.youtube.com/watch?v=Xsn0QjMN3fM"   "Gulabi Aankhen"
download 13  "13-o-mere-dil-ke-chain"   "https://www.youtube.com/watch?v=_w14bUcxl1c"   "O Mere Dil Ke Chain"
download 14  "14-ek-ladki-ko-dekha"     "https://www.youtube.com/watch?v=htMvfOfixuM"   "Ek Ladki Ko Dekha"
download 15  "15-dil-deewana"           "https://www.youtube.com/watch?v=5s68NXiaWgk"   "Dil Deewana"
download 16  "16-kabhi-kabhi-mere-dil"  "https://www.youtube.com/watch?v=-W2dagktUp0"   "Kabhi Kabhi Mere Dil"
download 17  "17-mehndi-laga-ke-rakhna" "https://www.youtube.com/watch?v=-bNwqXvMuB8"  "Mehndi Laga Ke Rakhna"
download 18  "18-chaiyya-chaiyya"       "https://www.youtube.com/watch?v=9yT4F8hzykY"   "Chaiyya Chaiyya"
download 19  "19-yaar-bina-chain"       "https://www.youtube.com/watch?v=rHVB-w1Dt2g"   "Yaar Bina Chain"
download 20  "20-disco-deewane"         "https://www.youtube.com/watch?v=_b2smR_tINE"   "Disco Deewane"
download 21  "21-khaike-paan-banaras"   "https://www.youtube.com/watch?v=VyqhPYe0vew"   "Khaike Paan Banaras"
download 22  "22-aap-ki-nazron-ne"      "https://www.youtube.com/watch?v=Wv-VlQMD0VY"   "Aap Ki Nazron Ne"
download 23  "23-hawa-hawai"            "https://www.youtube.com/watch?v=IgKdXLfxgQQ"   "Hawa Hawai"
download 24  "24-jumma-chumma-de-de"    "https://www.youtube.com/watch?v=5gTToFIZp-g"   "Jumma Chumma De De"
download 25  "25-ye-kaali-kaali-aankhen" "https://www.youtube.com/watch?v=KC-DuX51NY0"  "Ye Kaali Kaali Aankhen"
download 26  "26-choli-ke-peeche"       "https://www.youtube.com/watch?v=3OXiqmUhB70"   "Choli Ke Peeche"
download 27  "27-didi-tera-devar"       "https://www.youtube.com/watch?v=ZqcDGvCM_w0"   "Didi Tera Devar"
download 28  "28-jo-haal-dil-ka"        "https://www.youtube.com/watch?v=Y9OnEE7FAcc"   "Jo Haal Dil Ka"
download 29  "29-mere-khwabon-mein-jo"  "https://www.youtube.com/watch?v=s1LozokQjIg"   "Mere Khwabon Mein Jo"
download 30  "30-laila-main-laila"      "https://www.youtube.com/watch?v=1i_MwtbXezY"   "Laila Main Laila"

echo ""
echo "All 30 songs downloaded to: $AUDIO_DIR"
echo "Now run: git add audio/ && git commit -m 'chore: refresh all audio files' && git push"
