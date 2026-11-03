// ============================================================================
// 模組名稱: vga_render_9x9.v
// 目標晶片: Altera Cyclone II (EP2C35F672C6) / DE2 開發板
// 功能說明: 將 9x9 (81-Trit) 太玄棋盤顯存映射為 640x480 VGA RGB 色彩
//           - ADV7123 三路 10-bit 高速 DAC (VGA_R, VGA_G, VGA_B: 各 10 位元)
//           - 棋盤居中: 324x324 像素 (每格 36x36 像素，外加 2-pixel 邊框)
//           - 太玄三色映射:
//             * 地 (2'b00): 玄墨底色 (Dark Slate)
//             * 人 (2'b01): 和合翡翠 (Jade Emerald: #10B981)
//             * 天 (2'b10): 乾陽純金 (Imperial Gold: #F59E0B)
// ============================================================================

`timescale 1ns / 1ps

module vga_render_9x9 (
    input  wire        clk_25m,      // 畫素時鐘
    input  wire        video_on,     // 可視有效區
    input  wire [9:0]  pixel_x,      // 當前畫素 X
    input  wire [9:0]  pixel_y,      // 當前畫素 Y

    // VRAM 讀取端口
    output reg  [6:0]  vram_addr,    // 0 ~ 80
    input  wire [1:0]  vram_dout,    // 該格點 Trit 值

    // ADV7123 10-bit DAC 接口
    output reg  [9:0]  vga_r,
    output reg  [9:0]  vga_g,
    output reg  [9:0]  vga_b
);

    // 棋盤置中座標常數 (324x324 像素, 9x9 格, 每格 36 像素)
    localparam BOARD_X_START = 10'd158;
    localparam BOARD_X_END   = 10'd482; // 158 + 324 = 482
    localparam BOARD_Y_START = 10'd78;
    localparam BOARD_Y_END   = 10'd402; // 78 + 324 = 402

    wire in_board;
    assign in_board = (pixel_x >= BOARD_X_START && pixel_x < BOARD_X_END &&
                       pixel_y >= BOARD_Y_START && pixel_y < BOARD_Y_END);

    // 計算當前點相對棋盤的偏移
    wire [9:0] rel_x = in_board ? (pixel_x - BOARD_X_START) : 10'd0;
    wire [9:0] rel_y = in_board ? (pixel_y - BOARD_Y_START) : 10'd0;

    // 計算 0~8 的列 (col) 與行 (row)
    reg [3:0] col;
    reg [3:0] row;
    reg [5:0] cell_sub_x;
    reg [5:0] cell_sub_y;

    always @(*) begin
        // 水平每 36 像素一格
        if      (rel_x < 36)  begin col = 4'd0; cell_sub_x = rel_x; end
        else if (rel_x < 72)  begin col = 4'd1; cell_sub_x = rel_x - 36; end
        else if (rel_x < 108) begin col = 4'd2; cell_sub_x = rel_x - 72; end
        else if (rel_x < 144) begin col = 4'd3; cell_sub_x = rel_x - 108; end
        else if (rel_x < 180) begin col = 4'd4; cell_sub_x = rel_x - 144; end
        else if (rel_x < 216) begin col = 4'd5; cell_sub_x = rel_x - 180; end
        else if (rel_x < 252) begin col = 4'd6; cell_sub_x = rel_x - 216; end
        else if (rel_x < 288) begin col = 4'd7; cell_sub_x = rel_x - 252; end
        else                  begin col = 4'd8; cell_sub_x = rel_x - 288; end

        // 垂直每 36 像素一格
        if      (rel_y < 36)  begin row = 4'd0; cell_sub_y = rel_y; end
        else if (rel_y < 72)  begin row = 4'd1; cell_sub_y = rel_y - 36; end
        else if (rel_y < 108) begin row = 4'd2; cell_sub_y = rel_y - 72; end
        else if (rel_y < 144) begin row = 4'd3; cell_sub_y = rel_y - 108; end
        else if (rel_y < 180) begin row = 4'd4; cell_sub_y = rel_y - 144; end
        else if (rel_y < 216) begin row = 4'd5; cell_sub_y = rel_y - 180; end
        else if (rel_y < 252) begin row = 4'd6; cell_sub_y = rel_y - 216; end
        else if (rel_y < 288) begin row = 4'd7; cell_sub_y = rel_y - 252; end
        else                  begin row = 4'd8; cell_sub_y = rel_y - 288; end
    end

    // 生成 VRAM 尋址: row * 9 + col
    always @(*) begin
        if (in_board) begin
            vram_addr = (row * 7'd9) + {3'b000, col};
        end else begin
            vram_addr = 7'd0;
        end
    end

    // 判斷是否在格點的邊框上 (2-pixel border)
    wire is_cell_border = (cell_sub_x <= 1 || cell_sub_x >= 34 ||
                           cell_sub_y <= 1 || cell_sub_y >= 34);

    // RGB 渲染管線
    always @(posedge clk_25m) begin
        if (!video_on) begin
            vga_r <= 10'd0;
            vga_g <= 10'd0;
            vga_b <= 10'd0;
        end else if (in_board) begin
            if (is_cell_border) begin
                // 格線顏色: 沉穩鐵灰金屬邊線
                vga_r <= 10'd180;
                vga_g <= 10'd200;
                vga_b <= 10'd225;
            end else begin
                // 根據顯存中存儲的三進制 Trit 著色
                case (vram_dout)
                    2'b00: begin // 地 (Void / 坤陰) - 深邃玄黑底色
                        vga_r <= 10'd55;
                        vga_g <= 10'd65;
                        vga_b <= 10'd85;
                    end
                    2'b01: begin // 人 (Human / 翡翠綠 #10B981)
                        vga_r <= 10'd64;
                        vga_g <= 10'd740;
                        vga_b <= 10'd516;
                    end
                    2'b10: begin // 天 (Heaven / 乾陽金 #F59E0B)
                        vga_r <= 10'd980;
                        vga_g <= 10'd630;
                        vga_b <= 10'd60;
                    end
                    default: begin // 異常保護
                        vga_r <= 10'd400;
                        vga_g <= 10'd100;
                        vga_b <= 10'd100;
                    end
                endcase
            end
        end else begin
            // 棋盤外背景: 典雅墨水硯臺色 (#0B0F19)
            vga_r <= 10'd35;
            vga_g <= 10'd42;
            vga_b <= 10'd58;
        end
    end

endmodule
