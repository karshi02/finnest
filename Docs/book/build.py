"""สร้าง PDF เล่มโครงงานจาก book.src.html

    python build.py            -> ../PROJECT-BOOK.pdf

ต้องมี Google Chrome หรือ Microsoft Edge และไลบรารี pypdf (pip install pypdf)
ทำ 2 รอบ: รอบแรกพิมพ์เพื่อดูว่าหัวข้อ ตาราง และภาพอยู่หน้าไหน
รอบสองใส่เลขหน้าลงสารบัญ แล้วตั้งเลขหน้า ก ข ค (ส่วนหน้า) และ 1 2 3 (เนื้อหา)
"""
import html
import os
import re
import subprocess
import sys
import tempfile

from pypdf import PdfReader

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'book.src.html')
OUT_HTML = os.path.join(HERE, 'book.html')
OUT_PDF = os.path.normpath(os.path.join(HERE, '..', 'PROJECT-BOOK.pdf'))

BROWSERS = [
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    r'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
]
THAI_LETTERS = 'ก ข ค ง จ ฉ ช ซ ฌ ญ ฎ ฏ ฐ ฑ ฒ ณ ด ต ถ ท ธ น บ ป ผ ฝ พ ฟ ภ ม ย ร ล ว ศ ษ ส ห ฬ อ ฮ'.split()


def collect(src):
    """ใส่ marker ที่มองไม่เห็นไว้ในหัวข้อ/คำบรรยาย และเก็บรายการสำหรับสารบัญ"""
    entries = []

    def add(kind, text):
        key = 'k%d' % len(entries)
        entries.append({'key': key, 'kind': kind, 'text': text})
        return '<i class="mk">@@%s@@</i>' % key

    def heading(m):
        tag, attrs = m.group(1), m.group(2)
        text = html.unescape(re.search(r'data-toc="([^"]+)"', attrs).group(1))
        if 'data-kind="front"' in attrs:
            kind = 'front'
        elif tag == 'h1':
            kind = 'chap'
        else:
            kind = 'sec'
        return m.group(0) + add(kind, text)

    src = re.sub(r'<(h1|h2)([^>]*data-toc="[^"]+"[^>]*)>', heading, src)
    src = re.sub(r'(<div class="tcap">)(ตารางที่ [\d.]+ .*?)(</div>)',
                 lambda m: m.group(1) + add('table', m.group(2)) + m.group(2) + m.group(3), src)
    src = re.sub(r'(<figcaption>)(<b>ภาพที่ [\d.]+</b> .*?)(</figcaption>)',
                 lambda m: m.group(1) + add('figure', re.sub('<[^>]+>', '', m.group(2))) + m.group(2) + m.group(3), src)
    return src, entries


def row(text, pg, cls=''):
    return ('<div class="row %s"><span class="tx">%s</span><span class="dots"></span>'
            '<span class="pg">%s</span></div>' % (cls, html.escape(text), pg))


def render(src, entries, labels, front_start, body_start):
    toc, lot, lof = [], [], []
    for e in entries:
        pg = labels.get(e['key'], '00')
        if e['kind'] in ('front', 'chap'):
            toc.append(row(e['text'], pg))
        elif e['kind'] == 'sec':
            toc.append(row(e['text'], pg, 'l2'))
        elif e['kind'] == 'table':
            num, _, rest = e['text'].partition(' ')[2].partition(' ')
            lot.append(row(num + '  ' + rest, pg))
        else:
            num, _, rest = e['text'].partition(' ')[2].partition(' ')
            lof.append(row(num + '  ' + rest, pg))
    counters = (
        '@counter-style frontnum { system: fixed %d; symbols: %s; }\n'
        '@counter-style bodynum { system: fixed %d; symbols: %s; }'
        % (front_start, ' '.join('"%s"' % c for c in THAI_LETTERS),
           body_start, ' '.join('"%d"' % i for i in range(1, 400))))
    out = src.replace('/*COUNTERS*/', counters)
    out = out.replace('<!--TOC-->', '\n'.join(toc))
    out = out.replace('<!--LOT-->', '\n'.join(lot))
    out = out.replace('<!--LOF-->', '\n'.join(lof))
    return out


def print_pdf(html_text, pdf_path):
    with open(OUT_HTML, 'w', encoding='utf-8') as f:
        f.write(html_text)
    browser = next((b for b in BROWSERS if os.path.exists(b)), None)
    if not browser:
        sys.exit('ไม่พบ Chrome หรือ Edge')
    profile = tempfile.mkdtemp(prefix='book-chrome-')
    url = 'file:///' + OUT_HTML.replace('\\', '/')
    subprocess.run([browser, '--headless=new', '--disable-gpu', '--no-pdf-header-footer',
                    '--user-data-dir=' + profile, '--virtual-time-budget=8000',
                    '--print-to-pdf=' + pdf_path, url],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=300)
    if not os.path.exists(pdf_path):
        sys.exit('พิมพ์ PDF ไม่สำเร็จ')


def find_pages(pdf_path, entries):
    pages = {}
    for i, page in enumerate(PdfReader(pdf_path).pages, start=1):
        text = page.extract_text() or ''
        for key in re.findall(r'@@(k\d+)@@', text):
            pages.setdefault(key, i)
    missing = [e['text'] for e in entries if e['key'] not in pages]
    if missing:
        sys.exit('หา marker ไม่เจอ: %s' % missing)
    return pages


def main():
    src = open(SRC, encoding='utf-8').read()
    src, entries = collect(src)
    tmp_pdf = os.path.join(tempfile.gettempdir(), 'book-pass1.pdf')
    if os.path.exists(tmp_pdf):
        os.remove(tmp_pdf)

    print_pdf(render(src, entries, {}, 1, 1), tmp_pdf)
    pages = find_pages(tmp_pdf, entries)

    front_start = min(pages[e['key']] for e in entries if e['kind'] == 'front')
    body_start = pages[next(e['key'] for e in entries if e['kind'] == 'chap')]

    def label(p):
        return THAI_LETTERS[p - front_start] if p < body_start else str(p - body_start + 1)

    labels = {k: label(p) for k, p in pages.items()}
    if os.path.exists(OUT_PDF):
        os.remove(OUT_PDF)
    print_pdf(render(src, entries, labels, front_start, body_start), OUT_PDF)

    if find_pages(OUT_PDF, entries) != pages:
        sys.exit('เลขหน้าเปลี่ยนหลังใส่สารบัญ ให้รัน build.py อีกครั้ง')
    os.remove(OUT_HTML)  # ไฟล์ชั่วคราว แก้ที่ book.src.html แทน
    total = len(PdfReader(OUT_PDF).pages)
    print('OK: %s (%d หน้า, ส่วนหน้าเริ่มหน้า %d, บทที่ 1 เริ่มหน้า %d)' % (OUT_PDF, total, front_start, body_start))
    for e in entries:
        if e['kind'] in ('front', 'chap'):
            print('  %-4s %s' % (labels[e['key']], e['text']))


if __name__ == '__main__':
    main()
