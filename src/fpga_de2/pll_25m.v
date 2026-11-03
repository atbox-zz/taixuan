// ============================================================================
// 模組名稱: pll_25m.v
// 目標晶片: Altera Cyclone II (EP2C35F672C6) / DE2 開發板
// 功能說明: 將 DE2 板載 50MHz 主時鐘除頻為 25MHz VGA 畫素時鐘 (Pixel Clock)
//           適用於 640x480 @ 60Hz 標準 VGA 顯示時序。
// ============================================================================

`timescale 1ns / 1ps

module pll_25m (
    input  wire clk_50m,    // DE2 板載 CLOCK_50 (50MHz)
    input  wire rst_n,     // 異步低電平復位 (對應 KEY[0] 或 SW[0])
    output reg  clk_25m     // 25MHz VGA 畫素時鐘輸出
);

    always @(posedge clk_50m or negedge rst_n) begin
        if (!rst_n) begin
            clk_25m <= 1'b0;
        end else begin
            clk_25m <= ~clk_25m; // 50MHz 翻轉除二 = 25.0MHz (標準 640x480 容差 <0.7%)
        end
    end

endmodule
