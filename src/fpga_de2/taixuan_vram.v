// ============================================================================
// 模組名稱: taixuan_vram.v
// 目標晶片: Altera Cyclone II (EP2C35F672C6) / DE2 開發板
// 功能說明: 81-Trit (9x9 格點) 雙端口三進制顯存 (Dual-Port Ternary VRAM)
//           - Trit 編碼: 2'b00=地 (Void/0), 2'b01=人 (Balance/1), 2'b10=天 (Heaven/2)
//           - A 端口: 遊戲邏輯 / CPU 讀寫
//           - B 端口: VGA 畫面掃描專用讀取 (無爭搶)
// ============================================================================

`timescale 1ns / 1ps

module taixuan_vram (
    input  wire        clk,          // 系統時鐘
    input  wire        rst_n,        // 異步復位 (清空顯存)

    // Port A: 遊戲引擎與 CPU 讀寫端口
    input  wire [6:0]  addr_a,       // 0 ~ 80 (9x9 = 81 格)
    input  wire [1:0]  din_a,        // 寫入三進制數據 (2-bit Trit)
    input  wire        we_a,         // 寫使能
    output reg  [1:0]  dout_a,       // 讀出數據

    // Port B: VGA 掃描器讀取端口 (只讀)
    input  wire [6:0]  addr_b,       // 0 ~ 80
    output reg  [1:0]  dout_b        // 當前畫素格點之 Trit 值
);

    // 81 個 2-bit Trit 寄存器陣列
    reg [1:0] mem [0:80];
    integer i;

    // 寫入與異步清空
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            for (i = 0; i < 81; i = i + 1) begin
                mem[i] <= 2'b00; // 全部復位為「地」(0)
            end
        end else if (we_a && (addr_a < 7'd81)) begin
            mem[addr_a] <= din_a;
        end
    end

    // 讀取邏輯 (同步讀取)
    always @(posedge clk) begin
        if (addr_a < 7'd81) dout_a <= mem[addr_a];
        else                dout_a <= 2'b00;

        if (addr_b < 7'd81) dout_b <= mem[addr_b];
        else                dout_b <= 2'b00;
    end

endmodule
