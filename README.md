# UniLake AI · Frontend

Ứng dụng web phục vụ quản trị, khai thác và phân tích dữ liệu của nền tảng **UniLake AI**, với phạm vi nghiệp vụ gồm **Tuyển sinh**, **Đào tạo** và **Nhân sự**.

Frontend được xây dựng trên Next.js App Router và tổ chức giao diện theo vai trò người dùng. Repository có thể cài đặt, phát triển và build độc lập; các chức năng xác thực và truy xuất dữ liệu tích hợp với dịch vụ `Unilake-BE` qua REST API.

## Mục lục

- [Phạm vi chức năng](#phạm-vi-chức-năng)
- [Nền tảng kỹ thuật](#nền-tảng-kỹ-thuật)
- [Thiết lập môi trường](#thiết-lập-môi-trường)
- [Cấu hình kết nối API](#cấu-hình-kết-nối-api)
- [Phát triển và kiểm tra chất lượng](#phát-triển-và-kiểm-tra-chất-lượng)
- [Tổ chức mã nguồn](#tổ-chức-mã-nguồn)
- [Quản lý API contract](#quản-lý-api-contract)
- [Triển khai](#triển-khai)
- [Trạng thái tích hợp](#trạng-thái-tích-hợp)
- [Tài liệu tham khảo](#tài-liệu-tham-khảo)

## Phạm vi chức năng

| Vai trò | Đường dẫn chính | Nhóm chức năng |
| --- | --- | --- |
| Quản trị hệ thống (`ADMIN`) | `/admin` | Quản lý người dùng, phân quyền, cấu hình và nhật ký hệ thống |
| Quản trị dữ liệu (`DATA_ADMIN`) | `/data` | Quản lý nguồn dữ liệu, nạp dữ liệu, catalog, chất lượng và lineage |
| Chuyên viên phân tích (`ANALYST`) | `/analyst` | Khám phá dữ liệu, tổng quan phân hệ, truy vấn ngôn ngữ tự nhiên và lịch sử truy vấn |
| Trưởng đơn vị (`MANAGER`) | `/manager` | Theo dõi phân hệ, phân tích, so sánh và truy vấn AI |
| Ban Giám hiệu (`VIEWER`) | `/viewer` | Tổng quan điều hành, dashboard theo phân hệ và truy vấn AI |

Bảng trên mô tả phạm vi giao diện. Mức độ kết nối backend của từng nhóm chức năng được trình bày tại [Trạng thái tích hợp](#trạng-thái-tích-hợp).

## Nền tảng kỹ thuật

| Thành phần | Công nghệ |
| --- | --- |
| Framework | Next.js 15, React 19, TypeScript |
| Giao diện | Tailwind CSS, Radix UI, Lucide |
| Trực quan hóa | Recharts |
| Truy xuất dữ liệu | TanStack Query, Axios, `openapi-fetch` |
| Biểu mẫu và xác thực dữ liệu | React Hook Form, Zod |
| Kiểm thử | Vitest, Testing Library |
| Chất lượng mã nguồn | ESLint, Prettier |
| Đóng gói và CI | Docker, GitHub Actions, Lighthouse CI |

## Thiết lập môi trường

### Yêu cầu

- **Node.js 24**, đồng nhất với môi trường Docker, CI và Vercel.
- **pnpm 10.0.0**, theo trường `packageManager` trong `package.json`.
- Backend hoạt động và tài khoản hợp lệ để sử dụng các chức năng yêu cầu xác thực.

### Cài đặt và khởi chạy

Thực hiện tại thư mục gốc của repository:

```bash
corepack enable
corepack prepare pnpm@10.0.0 --activate
pnpm install --frozen-lockfile
cp .env.local.example .env.local
pnpm dev
```

Ứng dụng mặc định chạy tại [http://localhost:3000](http://localhost:3000). Truy cập [trang đăng nhập](http://localhost:3000/login) bằng tài khoản được cấp từ backend.

## Cấu hình kết nối API

Các biến môi trường được khai báo trong `.env.local`, dựa trên [.env.local.example](.env.local.example).

| Biến | Giá trị mặc định | Phạm vi sử dụng |
| --- | --- | --- |
| `API_BASE_URL` | `http://localhost:8000/api/v1` | Route handler phía server; URL bao gồm tiền tố `/api/v1` |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Axios client trên trình duyệt; client tự bổ sung tiền tố `/api/v1` |
| `NEXT_PUBLIC_API_BASE_URL` | `/api/proxy` | OpenAPI client; mặc định chuyển tiếp qua proxy cùng origin của Next.js |

Ứng dụng sử dụng hai luồng kết nối:

- **Axios:** trình duyệt gửi yêu cầu trực tiếp đến backend qua các hàm trong `src/api/`. Backend cần cấu hình `CORS_ORIGINS` cho phép origin của frontend, bao gồm protocol, hostname và cổng.
- **OpenAPI client:** yêu cầu được gửi đến `/api/proxy/*`, sau đó route handler của Next.js chuyển tiếp đến backend theo `API_BASE_URL`.

Khởi động lại dev server sau khi cập nhật `.env.local`. Các biến `NEXT_PUBLIC_*` được đưa vào bundle tại thời điểm build; thay đổi các giá trị này trong môi trường production yêu cầu build lại ứng dụng.

## Phát triển và kiểm tra chất lượng

### Các lệnh chính

| Lệnh | Mô tả |
| --- | --- |
| `pnpm dev` | Khởi chạy môi trường phát triển với Turbopack |
| `pnpm build` | Tạo bản build production |
| `pnpm start` | Khởi chạy bản build production |
| `pnpm type-check` | Kiểm tra kiểu dữ liệu TypeScript |
| `pnpm lint` | Kiểm tra ESLint với ngưỡng cảnh báo bằng 0 |
| `pnpm lint:fix` | Tự động sửa các lỗi ESLint được hỗ trợ |
| `pnpm format` | Định dạng mã nguồn trong `src/` |
| `pnpm format:check` | Kiểm tra định dạng mã nguồn trong `src/` |
| `pnpm test` | Chạy unit test và component test |
| `pnpm test:watch` | Chạy kiểm thử ở chế độ theo dõi thay đổi |
| `pnpm check-all` | Kiểm tra TypeScript, ESLint, định dạng và build |
| `pnpm gen:api` | Sinh khai báo TypeScript từ OpenAPI contract |

### Kiểm tra trước khi gửi thay đổi

```bash
pnpm check-all
pnpm test
```

`check-all` chưa bao gồm kiểm thử Vitest. Cấu hình Next.js hiện bỏ qua ESLint trong quá trình build, do đó lint cần được thực hiện riêng hoặc thông qua `check-all`.

### Continuous integration

Workflow [Frontend CI/CD](.github/workflows/ci-frontend.yml) áp dụng cho sự kiện push và pull request vào `main`, `develop`. Quy trình gồm cài đặt dependency, kiểm tra TypeScript, ESLint, định dạng, Vitest, build và đánh giá bằng Lighthouse CI. Sau khi tất cả kiểm tra thành công, push lên `main` được deploy lên Vercel Production, push lên `develop` được deploy lên Vercel Preview. Pull request chỉ chạy CI và không sử dụng secrets triển khai.

## Tổ chức mã nguồn

```text
.
├── src/
│   ├── app/          # Định tuyến, layout, provider và API route handler
│   ├── views/        # Màn hình theo nhóm chức năng nghiệp vụ
│   ├── components/   # Thành phần giao diện, bố cục và biểu đồ
│   ├── api/          # Axios client và các hàm gọi API nghiệp vụ
│   ├── lib/          # OpenAPI client, session, lịch sử truy vấn và tiện ích
│   ├── config/       # Cấu hình vai trò, menu, phân hệ và nguồn dữ liệu
│   ├── hooks/        # Hook xác thực và lựa chọn phân hệ
│   ├── types/        # Khai báo kiểu dữ liệu dùng chung
│   └── styles/       # Stylesheet toàn cục
├── docs/             # API contract và tài liệu kiểm thử tích hợp
├── public/           # Tài nguyên tĩnh
├── .github/workflows/ # Quy trình CI
└── Dockerfile        # Cấu hình build và chạy container
```

Các file kiểm thử `*.test.ts` và `*.test.tsx` được đặt cạnh mã nguồn tương ứng. Proxy backend nằm tại `src/app/api/proxy/[...path]/route.ts`; khai báo OpenAPI được sinh tại `src/lib/api/schema.d.ts`.

## Quản lý API contract

Snapshot OpenAPI được lưu tại `docs/api/openapi.json`. Khi tích hợp một phiên bản backend mới:

1. Cập nhật snapshot theo contract của phiên bản backend tương ứng.
2. Chạy lệnh sinh khai báo kiểu dữ liệu:

   ```bash
   pnpm gen:api
   ```

3. Rà soát thay đổi trong `src/lib/api/schema.d.ts`; cập nhật các hàm gọi API và kiểu dữ liệu liên quan trong `src/api/`, `src/types/`.
4. Chạy kiểm tra TypeScript, kiểm thử tự động và kiểm tra tích hợp cho các luồng bị ảnh hưởng.

`src/lib/api/schema.d.ts` là file được sinh tự động. Mọi thay đổi contract cần bắt đầu từ snapshot OpenAPI để tránh bị ghi đè ở lần sinh tiếp theo.

## Triển khai

### Vercel qua GitHub Actions

#### Thiết lập một lần

1. Tạo project trên Vercel cho repository này, chọn framework **Next.js**, Root Directory là thư mục gốc repository (`.`), Node.js **24.x** và Production Branch là `main`.
2. Trong **Vercel → Project → Settings → Environment Variables**, thêm các biến dưới đây cho cả **Production** và **Preview**. Có thể dùng backend khác nhau cho từng môi trường:

   | Biến | Ví dụ |
   | --- | --- |
   | `API_BASE_URL` | `https://api.example.com/api/v1` |
   | `NEXT_PUBLIC_API_URL` | `https://api.example.com` |
   | `NEXT_PUBLIC_API_BASE_URL` | `/api/proxy` |

   Thay `api.example.com` bằng backend thực tế có HTTPS, truy cập được từ Vercel và trình duyệt. Backend cần cho phép CORS với domain Production và các domain Preview được sử dụng. Không dùng `localhost` cho backend đã triển khai.

3. Tạo token tại [Vercel Account Settings → Tokens](https://vercel.com/account/tokens), cấp quyền cho tài khoản hoặc team sở hữu project.
4. Lấy Project ID và Team/Organization ID trong phần Settings tương ứng trên Vercel. Hoặc chạy tại thư mục gốc repository:

   ```bash
   pnpm dlx vercel@latest login
   pnpm dlx vercel@latest link
   ```

   Chọn đúng team và project vừa tạo. File `.vercel/project.json` chứa `projectId` và `orgId`; thư mục `.vercel/` đã được bỏ qua trong Git.

5. Trong **GitHub → Repository → Settings → Secrets and variables → Actions → New repository secret**, thêm:

   | Secret | Giá trị |
   | --- | --- |
   | `VERCEL_TOKEN` | Token vừa tạo |
   | `VERCEL_ORG_ID` | `orgId` của team hoặc tài khoản sở hữu project |
   | `VERCEL_PROJECT_ID` | `projectId` của project frontend |

   Khai báo secrets bằng giao diện GitHub, không ghi token vào repository. Workflow sử dụng GitHub Environments `production` và `preview`; nếu repository đã đặt quy tắc bảo vệ môi trường, cần cho phép nhánh tương ứng triển khai.

#### Luồng triển khai

| Sự kiện | Kết quả sau khi CI thành công |
| --- | --- |
| Pull request vào `main` hoặc `develop` | Chỉ kiểm tra CI |
| Push/merge vào `develop` | Deploy Preview |
| Push/merge vào `main` | Deploy Production và cập nhật domain production |

Job deploy chạy `vercel pull` để lấy cấu hình và biến môi trường, `vercel build` để tạo artifact, sau đó `vercel deploy --prebuilt` để triển khai. Production dùng thêm `--prod` ở cả bước build và deploy, theo [hướng dẫn GitHub Actions của Vercel](https://vercel.com/kb/guide/how-can-i-use-github-actions-with-vercel). Bản build trong job CI dùng để kiểm tra và chạy Lighthouse; job deploy build lại với đúng biến môi trường lấy từ Vercel.

File [vercel.json](vercel.json) tắt tự động deploy từ Git bằng `git.deploymentEnabled: false` để chỉ triển khai qua workflow sau khi CI thành công, theo [cấu hình Git của Vercel](https://vercel.com/docs/project-configuration/git-configuration). Workflow báo lỗi rõ ràng nếu thiếu secrets. URL triển khai được ghi trong **GitHub Actions → workflow run → Summary** và GitHub Environment tương ứng.

Sau khi cấu hình xong, push thay đổi lên `develop` để kiểm tra Preview, sau đó merge vào `main` để đưa lên Production. Khi thay đổi biến `NEXT_PUBLIC_*` trên Vercel, cần chạy lại workflow để build và deploy với giá trị mới.

### Chạy trực tiếp

Sau khi cấu hình biến môi trường cho môi trường đích:

```bash
pnpm build
pnpm start
```

### Chạy bằng Docker

Ví dụ dưới đây áp dụng cho Docker Desktop trên macOS hoặc Windows, với backend chạy trên máy host:

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:8000 \
  --build-arg NEXT_PUBLIC_API_BASE_URL=/api/proxy \
  -t unilake-fe .

docker run --rm \
  -p 3000:3000 \
  -e API_BASE_URL=http://host.docker.internal:8000/api/v1 \
  unilake-fe
```

Ứng dụng được cung cấp tại [http://localhost:3000](http://localhost:3000).

Khi cấu hình môi trường triển khai, `NEXT_PUBLIC_API_URL` phải là địa chỉ backend truy cập được từ trình duyệt người dùng. `API_BASE_URL` phải là địa chỉ truy cập được từ server hoặc container frontend. Hai địa chỉ có thể khác nhau tùy cấu trúc mạng; backend cần cho phép origin thực tế của frontend trong cấu hình CORS.

## Trạng thái tích hợp

| Nhóm chức năng | Trạng thái |
| --- | --- |
| Xác thực | Đã tích hợp API đăng nhập, làm mới token và đăng xuất |
| Nguồn dữ liệu | Đã tích hợp API danh sách, chi tiết, tạo và cập nhật |
| Ingestion | Đã có API client cho danh sách và tạo job; báo cáo tích hợp chưa xác nhận luồng tạo job thành công |
| Catalog và khám phá dữ liệu | Đã tích hợp API catalog |
| Truy vấn AI | Đã kết nối `/api/v1/nlq/ask`; theo báo cáo ngày 29/10/2026, backend trả dữ liệu mô phỏng |
| Lịch sử truy vấn | Lưu tại `localStorage` của trình duyệt, chưa đồng bộ backend |
| Dashboard, Data Quality, Data Lineage, quản trị hệ thống | Giao diện sử dụng dữ liệu mẫu |

Kết quả kiểm thử backend, các khác biệt so với API contract và công việc tích hợp còn lại được ghi nhận trong [báo cáo tích hợp API](docs/api-integration-report.md).

## Tài liệu tham khảo

- [Mẫu cấu hình môi trường](.env.local.example)
- [OpenAPI contract](docs/api/openapi.json)
- [Báo cáo kiểm thử tích hợp API](docs/api-integration-report.md)
- [Checklist kiểm thử và xử lý lỗi](docs/error-checklist.md)
- [Cấu hình Frontend CI/CD](.github/workflows/ci-frontend.yml)
- [Cấu hình Vercel](vercel.json)
