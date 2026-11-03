// ============================================================================
// 模組名稱: vga_sync_gen.v
// 目標晶片: Altera Cyclone II (EP2C35F672C6) / DE2 開發板
// 功能說明: 640x480 @ 60Hz 標準 VGA 行場同步時序生成器
//           - Pixel Clock: 25MHz / 25.175MHz
//           - H: 800 Clocks (Sync=96, Back=48, Active=640, Front=16)
//           - V: 525 Lines  (Sync=2,  Back=33, Active=480, Front=10)
//           - 生成像素座標 (pixel_x, pixel_y) 與 ADV7123 BLANK 控制信號
// ============================================================================

`timescale 1ns / 1ps

module vga_sync_gen (
    input  wire        clk_25m,      // 25MHz 畫素時鐘
    input  wire        rst_n,        // 異步復位
    output reg         hsync,        // 行同步脈衝 (負極性)
    output reg         vsync,        // 場同步脈衝 (負極性)
    output reg         video_on,     // 顯示有效區 (Active Video)
    output reg  [9:0]  pixel_x,      // 當前畫素 X 座標 (0 ~ 639)
    output reg  [9:0]  pixel_y,      // 當前畫素 Y 座標 (0 ~ 479)
    output wire        vga_blank,    // ADV7123 DAC 專用 BLANK 信號 (高有效)
    output wire        vga_sync      // ADV7123 DAC SYNC (置 0)
);

    // 行時序參數 (水平)
    localparam H_ACTIVE = 10'd640;
    localparam H_FRONT  = 10'd16;
    localparam H_SYNC   = 10'd96;
    localparam H_BACK   = 10'd48;
    localparam H_TOTAL  = 10'd800;

    // 場時序參數 (垂直)
    localparam V_ACTIVE = 10'd480;
    localparam V_FRONT  = 10'd10;
    localparam V_SYNC   = 10'd2;
    localparam V_BACK   = 10'd33;
    localparam V_TOTAL  = 10'd525;

    reg [9:0] h_cnt;
    reg [9:0] v_cnt;

    // 行/場計數器
    always @(posedge clk_25m or negedge rst_n) begin
        if (!rst_n) begin
            h_cnt <= 10'd0;
            v_cnt <= 10'd0;
        end else begin
            if (h_cnt == H_TOTAL - 1) begin
                h_cnt <= 10'd0;
                if (v_cnt == V_TOTAL - 1)
                    v_cnt <= 10'd0;
                else
                    v_cnt <= v_cnt + 1'b1;
            end else begin
                h_cnt <= h_cnt + 1'b1;
            end
        end
    end

    // 生成同步與有效區信號
    always @(posedge clk_25m or negedge rst_n) begin
        if (!rst_n) begin
            hsync    <= 1'b1;
            vsync    <= 1'b1;
            video_on <= 1'b0;
            pixel_x  <= 10'd0;
            pixel_y  <= 10'd0;
        end else begin
            // 負極性同步
            hsync <= ~(h_cnt >= (H_ACTIVE + H_FRONT) && h_cnt < (H_ACTIVE + H_FRONT + H_SYNC));
            vsync <= ~(v_cnt >= (V_ACTIVE + V_FRONT) && v_cnt < (V_ACTIVE + V_FRONT + V_SYNC));

            // 有效可視區判斷
            if (h_cnt < H_ACTIVE && v_cnt < V_ACTIVE) begin
                video_on <= 1'b1;
                pixel_x  <= h_cnt;
                pixel_y  <= v_cnt;
            end else begin
                video_on <= 1'b0;
                pixel_x  <= 10'd0;
                pixel_y  <= 10'd0;
            end
        end
    end

    // DE2 的 ADV7123 晶片引腳要求
    assign vga_blank = video_on;
    assign vga_sync  = 1'b0;

endmodule
