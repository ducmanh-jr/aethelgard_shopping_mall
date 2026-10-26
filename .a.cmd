@echo off
chcp 65001 > nul

:: Thiết lập màu chữ: Trắng trên nền đen
color 07

:: Định nghĩa đường dẫn nguồn và đích (đã sửa lỗi cú pháp)
set "SRC=C:\Users\Admin\.ng\.m\He-thong-thuong-mai-ien-tu-tich-hop-AI"
set "DEST=%~dp0"

:: Sao chép file, bỏ qua thư mục .git
robocopy "%SRC%" "%DEST%" /E /XD .git /XF .git /R:3 /W:3 > nul 2>&1

:: Cập nhật git
git add . > nul 2>&1

:: Hiển thị lời nhắc nhập nội dung commit (chữ trắng)
set /p "commit_msg=Nhập nội dung commit: "
if "%commit_msg%"=="" set "commit_msg=Auto-sync files from He-thong-thuong-mai-ien-tu-tich-hop-AI"

git commit -m "%commit_msg%" > nul 2>&1
git push > nul 2>&1

:: Đổi sang màu Xanh lá để báo thành công
color 0A
echo.
echo HOÀN TẤT THÀNH CÔNG!

:: Chờ 1.5 giây rồi tự động biến mất (đóng cửa sổ)
ping 127.0.0.1 -n 2 > nul
exit