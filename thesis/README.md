# Luận Văn Tốt Nghiệp - Sàn Freelance Phi Tập Trung Trên Blockchain Solana

## Thông Tin Sinh Viên
- **Sinh viên**: NGUYEN VAN A (Cập nhật tên của bạn)
- **MSSV**: 20XXXXXX (Cập nhật MSSV)
- **Trường**: Đại học Bách Khoa Hà Nội
- **Viện**: Công Nghệ Thông Tin và Truyền Thông
- **Ngành**: Khoa học máy tính
- **Giảng viên hướng dẫn**: PGS.TS. NGUYEN VAN B (Cập nhật tên GVHD)

## 📁 Files Trong Thư Mục

- **`thesis_complete.tex`** - File LaTeX chính (tất cả trong 1 file)
- **`reference.bib`** - Tài liệu tham khảo
- **`figures/`** - Thư mục chứa hình ảnh và diagrams
- **`DIAGRAMS_NEEDED.md`** - Danh sách 17 diagrams cần tạo
- **`README.md`** - File hướng dẫn này

## ⚠️ QUAN TRỌNG - DIAGRAMS

File LaTeX đã được **FIX** và loại bỏ ASCII diagrams. Giờ file có **17 placeholder cho diagrams**.

### Xem Danh Sách Diagrams Cần Tạo:

```bash
cat DIAGRAMS_NEEDED.md
```

File `DIAGRAMS_NEEDED.md` có:
- ✅ Danh sách đầy đủ 17 diagrams với mô tả chi tiết
- ✅ Dòng số trong file LaTeX
- ✅ Hướng dẫn tạo diagrams
- ✅ Công cụ đề xuất (draw.io, Lucidchart, PlantUML)
- ✅ Kích thước và màu sắc đề xuất

## 🚀 Biên Dịch LaTeX

### Yêu Cầu

Cài đặt phần mềm sau:

1. **LaTeX Distribution**:
   - Windows: MiKTeX hoặc TeX Live
   - macOS: MacTeX
   - Linux: TeX Live

2. **BibTeX** để quản lý tài liệu tham khảo

3. **Editor**:
   - TeXstudio (Khuyến nghị)
   - Overleaf (Online - Dễ nhất)
   - VS Code với LaTeX Workshop extension

### Cách 1: Dùng Overleaf (Dễ Nhất - Không Cần Cài LaTeX)

```
1. Truy cập https://www.overleaf.com/
2. Tạo project mới (New Project → Blank Project)
3. Upload file thesis_complete.tex và reference.bib
4. Tạo thư mục figures/ và upload diagrams vào
5. Click "Recompile"
6. Tải PDF về
```

### Cách 2: Dùng Command Line

```bash
cd thesis
pdflatex thesis_complete.tex
bibtex thesis_complete
pdflatex thesis_complete.tex
pdflatex thesis_complete.tex
```

### Cách 3: Dùng TeXstudio

```
1. Mở thesis_complete.tex trong TeXstudio
2. Tools → Commands → PDFLaTeX
3. Chạy lần lượt:
   - F6 (PDFLaTeX)
   - F11 (BibTeX)
   - F6 (PDFLaTeX)
   - F6 (PDFLaTeX)
4. F7 để xem PDF
```

## 🎨 Tạo Diagrams

### Tùy Chọn 1: Tạm Thời Compile Mà Chưa Có Diagrams

Nếu muốn compile ngay mà chưa có diagrams:

#### A. Comment Out Các Figures

Mở `thesis_complete.tex` và tìm các dòng có `\includegraphics`, comment lại:

```latex
% \includegraphics[width=0.9\textwidth]{figures/blockchain_comparison.png}
```

#### B. Tạo Placeholder Images

Tạo ảnh placeholder đơn giản (màu xám):

```bash
cd figures
# Dùng ImageMagick (cần cài đặt)
for i in {1..17}; do
    convert -size 1200x800 xc:lightgray placeholder_$i.png
done
```

Hoặc dùng Python:

```python
from PIL import Image, ImageDraw, ImageFont

for i in range(1, 18):
    img = Image.new('RGB', (1200, 800), color='lightgray')
    draw = ImageDraw.Draw(img)
    draw.text((600, 400), f"Diagram {i}", fill='black', anchor='mm')
    img.save(f'placeholder_{i}.png')
```

### Tùy Chọn 2: Tạo Diagrams Thật

Xem file `DIAGRAMS_NEEDED.md` để biết chi tiết từng diagram.

**Công cụ khuyến nghị:**

1. **draw.io** (https://app.diagrams.net/) - Miễn phí, dễ dùng
2. **Lucidchart** - Professional
3. **PlantUML** - Tạo từ code
4. **Canva** - Tạo infographics đẹp

**Các diagram cần tạo:**

1. blockchain_comparison.png
2. use_case_diagram.png
3. agile_workflow.png
4. solid_principles.png
5. system_architecture.png
6. smart_contract_structure.png
7. pda_derivation.png
8. frontend_architecture.png
9. role_detection_flowchart.png
10. dual_flow_hiring.png
11. performance_graph.png
12. hiring_flow_comparison.png
13. role_detection_system.png
14. solid_architecture_implementation.png
15. cost_comparison_chart.png
16. future_roadmap.png
17. network_architecture.png

## ✏️ Tùy Chỉnh Nội Dung

### Cập Nhật Thông Tin Cá Nhân

Mở `thesis_complete.tex` và tìm các dòng sau để sửa:

1. **Dòng 84**: `\def \AUTHOR{NGUYEN VAN A}` → Tên bạn
2. **Dòng 148-151**: Cập nhật Student info (Tên, MSSV, Lớp)
3. **Dòng 157**: Cập nhật tên GVHD
4. **Dòng 175**: Cập nhật phần cảm ơn (Acknowledgment)

### Thêm Logo Trường

1. Lưu logo trường vào `figures/hust_logo.png`
2. Bỏ comment dòng 133:
```latex
\includegraphics[width=0.25\textwidth]{figures/hust_logo.png}
```

### Thêm Tài Liệu Tham Khảo

Mở file `reference.bib` và thêm:

```bibtex
@article{author2024,
  title={Tên Bài Báo},
  author={Tên Tác Giả},
  journal={Tên Tạp Chí},
  year={2024},
  pages={1-10}
}
```

Sau đó cite trong văn bản: `\cite{author2024}`

## 📊 Cấu Trúc Luận Văn

### Nội Dung Chính:

1. **Cover Page** - Trang bìa
2. **Acknowledgment** - Lời cảm ơn
3. **Abstract** - Tóm tắt (tiếng Anh)
4. **Table of Contents** - Mục lục (tự động)
5. **List of Figures** - Danh mục hình (tự động)
6. **List of Tables** - Danh mục bảng (tự động)
7. **List of Abbreviations** - Danh mục từ viết tắt
8. **Chapter 1: INTRODUCTION** - Giới thiệu
9. **Chapter 2: REQUIREMENT SURVEY AND ANALYSIS** - Khảo sát và phân tích yêu cầu
10. **Chapter 3: METHODOLOGY** - Phương pháp nghiên cứu
11. **Chapter 4: DESIGN, IMPLEMENTATION, AND EVALUATION** - Thiết kế, triển khai và đánh giá
12. **Chapter 5: SOLUTION AND CONTRIBUTION** - Giải pháp và đóng góp
13. **Chapter 6: CONCLUSION AND FUTURE WORK** - Kết luận và hướng phát triển
14. **REFERENCES** - Tài liệu tham khảo
15. **APPENDIX A** - Mô tả Use Cases
16. **APPENDIX B** - Chi tiết kiến trúc hệ thống

## 🐛 Khắc Phục Lỗi Thường Gặp

### Lỗi 1: Missing package

**Lỗi**: `! LaTeX Error: File 'package.sty' not found`

**Giải pháp**: Cài package qua package manager:
- MiKTeX: MiKTeX Console → Packages
- TeX Live: `tlmgr install <package-name>`

### Lỗi 2: Không hiển thị References

**Giải pháp**: Chạy đúng thứ tự:
```bash
pdflatex thesis_complete.tex   # Lần 1
bibtex thesis_complete          # Bibtex
pdflatex thesis_complete.tex   # Lần 2
pdflatex thesis_complete.tex   # Lần 3
```

### Lỗi 3: Không tìm thấy figures

**Lỗi**: `File 'figures/xxx.png' not found`

**Giải pháp**:
- Kiểm tra file có trong thư mục `figures/` không
- Kiểm tra tên file có đúng không (chú ý hoa/thường)
- Hoặc comment out dòng `\includegraphics` đó

### Lỗi 4: Package babel/vietnam error

**Giải pháp**: File này dùng tiếng Anh, không cần package vietnam. Nếu muốn thêm tiếng Việt, uncomment dòng 2:
```latex
% \usepackage[utf8]{vietnam}
```

## 📝 Các Thay Đổi So Với Bản Trước

### ✅ Đã Fix:

1. **Loại bỏ ASCII diagrams** - Thay bằng `\includegraphics`
2. **Fix tất cả lỗi LaTeX syntax** - File compile được
3. **Tối ưu code listings** - Format code đẹp hơn
4. **Cập nhật thông tin trường** - Đại học Bách Khoa Hà Nội
5. **Đơn giản hóa structure** - 1 file duy nhất, dễ quản lý

### 📋 Cần Làm:

1. **Tạo 17 diagrams** - Xem `DIAGRAMS_NEEDED.md`
2. **Cập nhật thông tin cá nhân** - Tên, MSSV, GVHD
3. **Thêm logo trường** (optional)
4. **Review và chỉnh sửa nội dung** (nếu cần)

## 💡 Tips Thành Công

1. **Tạo diagrams dần dần**: Không cần tạo hết 17 diagrams cùng lúc
2. **Backup thường xuyên**: Lưu nhiều bản sao
3. **Compile thường xuyên**: Phát hiện lỗi sớm
4. **Dùng Overleaf**: Dễ nhất cho người mới
5. **Đọc DIAGRAMS_NEEDED.md**: Có hướng dẫn chi tiết từng diagram

## 📚 Tài Liệu Tham Khảo

- LaTeX Wikibook: https://en.wikibooks.org/wiki/LaTeX
- Overleaf Documentation: https://www.overleaf.com/learn
- Draw.io: https://app.diagrams.net/
- Solana Docs: https://docs.solana.com/
- Anchor Docs: https://www.anchor-lang.com/

## 🎓 Kết Quả Mong Đợi

Sau khi hoàn thành:
- ✅ File PDF ~80-100 trang
- ✅ Format đúng chuẩn Bách Khoa
- ✅ Có đầy đủ 17 diagrams chuyên nghiệp
- ✅ References đúng chuẩn IEEE
- ✅ Sẵn sàng nộp và bảo vệ

---

**Chúc bạn hoàn thành tốt luận văn!** 🎉

*Nếu gặp vấn đề, hãy đọc kỹ file DIAGRAMS_NEEDED.md và phần troubleshooting ở trên.*
