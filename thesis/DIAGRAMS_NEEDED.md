# Danh Sách Diagrams Cần Thêm

Các file ảnh sau cần được tạo và đặt vào thư mục `figures/`:

## Chapter 2: Requirement Survey and Analysis

1. **blockchain_comparison.png** (Dòng 460)
   - So sánh các blockchain platforms (Ethereum, Solana, BSC)
   - Biểu đồ cột hoặc bảng so sánh TPS, cost, finality time

2. **use_case_diagram.png** (Dòng 624)
   - Use case diagram của hệ thống
   - Actors: Client, Freelancer, System
   - Use cases: Create Job, Submit Bid, Release Payment, Submit Review, etc.

## Chapter 3: Methodology

3. **agile_workflow.png** (Dòng 733)
   - Quy trình Agile development
   - Sprint planning → Development → Testing → Deployment → Retrospective

4. **solid_principles.png** (Dòng 796)
   - Diagram minh họa 5 nguyên tắc SOLID
   - SRP, OCP, LSP, ISP, DIP với ví dụ

## Chapter 4: Design, Implementation, and Evaluation

5. **system_architecture.png** (Dòng 896)
   - Kiến trúc tầng của hệ thống
   - Presentation Layer → Application Layer → Infrastructure Layer → Blockchain Layer

6. **smart_contract_structure.png** (Dòng 920)
   - Cấu trúc các smart contract modules
   - Job Module, Bid Module, Escrow Module, Reputation Module

7. **pda_derivation.png** (Dòng 965)
   - Quy trình tạo Program Derived Address
   - Seeds + Program ID → PDA

8. **frontend_architecture.png** (Dòng 979)
   - Cấu trúc frontend application
   - Pages, Components, Hooks, Contexts, Utils

9. **role_detection_flowchart.png** (Dòng 995)
   - Flowchart thuật toán phát hiện role
   - Check reputation → Check bids → Check jobs → Assign role

10. **dual_flow_hiring.png** (Dòng 1009)
    - So sánh 2 luồng tuyển dụng
    - Job-first flow vs Freelancer-first flow

11. **performance_graph.png** (Dòng 1066)
    - Biểu đồ hiệu suất hệ thống
    - TPS vs Number of concurrent users

## Chapter 5: Solution and Contribution

12. **hiring_flow_comparison.png** (Dòng 1102)
    - So sánh traditional vs hybrid hiring flows
    - 2 columns với các steps

13. **role_detection_system.png** (Dòng 1122)
    - Hệ thống phát hiện role tự động
    - Multi-source data → Detection algorithm → Role assignment

14. **solid_architecture_implementation.png** (Dòng 1142)
    - Implementation của SOLID architecture
    - Class diagram với dependencies

15. **cost_comparison_chart.png** (Dòng 1166)
    - Biểu đồ so sánh chi phí
    - Bar chart: Upwork, Fiverr, Ethlance, Our Platform

## Chapter 6: Conclusion and Future Work

16. **future_roadmap.png** (Dòng 1292)
    - Roadmap phát triển tương lai
    - Timeline với các milestones: Short-term, Medium-term, Long-term

## Appendix B

17. **network_architecture.png** (Dòng 1366)
    - Kiến trúc mạng đầy đủ
    - Client → Frontend → RPC → Solana → IPFS/Wallet

---

## Hướng Dẫn Tạo Diagrams

### Công Cụ Đề Xuất:

1. **draw.io** (https://app.diagrams.net/)
   - Miễn phí, online
   - Có sẵn templates cho UML, flowchart, architecture

2. **Lucidchart** (https://www.lucidchart.com/)
   - Professional, nhiều templates

3. **PlantUML** (https://plantuml.com/)
   - Tạo diagram từ code text
   - Tốt cho class diagram, sequence diagram

4. **Microsoft Visio**
   - Professional software

5. **Canva** (https://www.canva.com/)
   - Tạo infographics và charts đẹp

### Kích Thước Đề Xuất:

- **Width**: 1200-1600px
- **Height**: 800-1200px (tùy diagram)
- **Format**: PNG hoặc PDF
- **Resolution**: 300 DPI (cho in ấn chất lượng cao)

### Màu Sắc Đề Xuất:

- **Primary**: #1976D2 (Blue - cho Solana theme)
- **Secondary**: #424242 (Dark Gray)
- **Accent**: #FFC107 (Amber - cho highlights)
- **Background**: #FFFFFF hoặc #F5F5F5

### Style Guide:

- Font: Arial, Helvetica, hoặc Roboto (sans-serif)
- Font size cho labels: 12-14pt
- Font size cho titles: 16-18pt
- Line thickness: 2-3px
- Arrows: Solid lines với arrow heads rõ ràng

---

## Quick Start

### Cách Nhanh Nhất:

1. Sử dụng draw.io
2. Chọn template phù hợp (UML, Flowchart, Network)
3. Tùy chỉnh theo mô tả trên
4. Export as PNG
5. Lưu vào `figures/` với đúng tên file
6. Compile LaTeX lại

### Ví Dụ Tạo System Architecture:

```
1. Mở draw.io
2. Chọn "Software Architecture" template
3. Tạo 4 layers:
   - Presentation (Next.js UI)
   - Application (Services)
   - Infrastructure (Repositories)
   - Blockchain (Smart Contracts)
4. Vẽ mũi tên kết nối các layers
5. Export → PNG → Lưu as system_architecture.png
```

---

## Tạm Thời Compile Mà Chưa Có Diagrams

Nếu bạn muốn compile LaTeX mà chưa có diagrams:

### Cách 1: Comment out các figures

Tìm và comment out các dòng \includegraphics:

```latex
% \includegraphics[width=0.9\textwidth]{figures/blockchain_comparison.png}
```

### Cách 2: Tạo placeholder images

Tạo các file trống bằng ImageMagick:

```bash
cd figures
for i in {1..17}; do
    convert -size 1200x800 xc:lightgray placeholder_$i.png
done
```

Sau đó đổi tên các file placeholder thành tên đúng.

---

## Checklist

- [ ] blockchain_comparison.png
- [ ] use_case_diagram.png
- [ ] agile_workflow.png
- [ ] solid_principles.png
- [ ] system_architecture.png
- [ ] smart_contract_structure.png
- [ ] pda_derivation.png
- [ ] frontend_architecture.png
- [ ] role_detection_flowchart.png
- [ ] dual_flow_hiring.png
- [ ] performance_graph.png
- [ ] hiring_flow_comparison.png
- [ ] role_detection_system.png
- [ ] solid_architecture_implementation.png
- [ ] cost_comparison_chart.png
- [ ] future_roadmap.png
- [ ] network_architecture.png

---

**Lưu Ý**: Không cần phải tạo tất cả diagrams cùng lúc. Bạn có thể tạo dần và compile lại sau khi thêm mỗi diagram.
