// ============================================================================
// 模組名稱: de2_taixuan_top.v
// 目標板卡: Altera DE2 Board (Cyclone II EP2C35F672C6)
// 功能說明: 《太玄三進制微機與三象方塊》頂層硬體整合模組
// ============================================================================

`timescale 1ns / 1ps

module de2_taixuan_top (
    // 50MHz 板載主時鐘
    input  wire        CLOCK_50,

    // 4 顆輕觸按鍵 (Active-Low 低電平按下)
    input  wire [3:0]  KEY,

    // 18 位滑動開關 (高電平有效)
    input  wire [17:0] SW,

    // 8 組 7 段數碼管 (低電平點亮，Active-Low)
    output wire [6:0]  HEX0,
    output wire [6:0]  HEX1,
    output wire [6:0]  HEX2,
    output wire [6:0]  HEX3,
    output wire [6:0]  HEX4,
    output wire [6:0]  HEX5,
    output wire [6:0]  HEX6,
    output wire [6:0]  HEX7,

    // LED 指示燈
    output wire [17:0] LEDR,         // 紅色 LED
    output wire [8:0]  LEDG,         // 綠色 LED

    // ADV7123 VGA 10-bit DAC 接口
    output wire        VGA_CLK,      // DAC 時鐘 (25MHz)
    output wire        VGA_HS,       // 行同步
    output wire        VGA_VS,       // 場同步
    output wire        VGA_BLANK,    // 消隱 (高有效)
    output wire        VGA_SYNC,     // 同步
    output wire [9:0]  VGA_R,        // 紅色 10-bit
    output wire [9:0]  VGA_G,        // 綠色 10-bit
    output wire [9:0]  VGA_B         // 藍色 10-bit
);

    // ========================================================================
    // 1. 系統復位與時鐘管理
    // ========================================================================
    // SW[0] 為高時復位，或 KEY[0] 同時作為硬復位
    wire sys_rst_n = ~SW[0];
    wire clk_25m;

    pll_25m u_pll (
        .clk_50m (CLOCK_50),
        .rst_n   (sys_rst_n),
        .clk_25m (clk_25m)
    );

    assign VGA_CLK = clk_25m;

    // ========================================================================
    // 2. 按鍵消抖與邊沿脈衝檢測 (KEY[3:0] 低電平按下)
    // ========================================================================
    reg [3:0] key_d1, key_d2;
    always @(posedge CLOCK_50 or negedge sys_rst_n) begin
        if (!sys_rst_n) begin
            key_d1 <= 4'b1111;
            key_d2 <= 4'b1111;
        end else begin
            key_d1 <= KEY;
            key_d2 <= key_d1;
        end
    end

    // 下降沿檢測 (按下瞬間產生 1 拍高脈衝)
    wire pulse_rot   = (key_d2[0] == 1'b1 && key_d1[0] == 1'b0); // KEY[0]: 旋轉
    wire pulse_left  = (key_d2[1] == 1'b1 && key_d1[1] == 1'b0); // KEY[1]: 左移
    wire pulse_right = (key_d2[2] == 1'b1 && key_d1[2] == 1'b0); // KEY[2]: 右移
    wire pulse_drop  = (key_d2[3] == 1'b1 && key_d1[3] == 1'b0); // KEY[3]: 急降

    // ========================================================================
    // 3. 雙端口 81-Trit (9x9) 顯存 (VRAM)
    // ========================================================================
    wire [6:0] vram_addr_a;
    wire [1:0] vram_din_a;
    wire       vram_we_a;
    wire [1:0] vram_dout_a;

    wire [6:0] vram_addr_b;
    wire [1:0] vram_dout_b;

    taixuan_vram u_vram (
        .clk    (CLOCK_50),
        .rst_n  (sys_rst_n),
        // A 端口: 遊戲引擎 / CPU 寫入
        .addr_a (vram_addr_a),
        .din_a  (vram_din_a),
        .we_a   (vram_we_a),
        .dout_a (vram_dout_a),
        // B 端口: VGA 畫面掃描讀取
        .addr_b (vram_addr_b),
        .dout_b (vram_dout_b)
    );

    // ========================================================================
    // 4. 太玄俄羅斯方塊遊戲邏輯 (Tetris Engine)
    // ========================================================================
    wire [15:0] game_score;
    wire [7:0]  lines_cleared;
    wire        game_over;

    wire        tetris_vram_we;
    wire [6:0]  tetris_vram_addr;
    wire [1:0]  tetris_vram_wdata;

    tetris_logic u_tetris (
        .clk_50m       (CLOCK_50),
        .rst_n         (sys_rst_n),
        .btn_rotate    (pulse_rot),
        .btn_left      (pulse_left),
        .btn_right     (pulse_right),
        .btn_drop      (pulse_drop),
        .vram_we       (tetris_vram_we),
        .vram_addr     (tetris_vram_addr),
        .vram_wdata    (tetris_vram_wdata),
        .score         (game_score),
        .lines_cleared (lines_cleared),
        .game_over     (game_over)
    );

    // ========================================================================
    // 5. 太玄 81 首微處理器核心 (Tai Xuan CPU)
    // ========================================================================
    wire [6:0] cpu_pc;
    wire [6:0] cpu_shou_idx;
    wire [7:0] cpu_acc;
    wire [2:0] cpu_flags;
    wire       cpu_vram_we;
    wire [6:0] cpu_vram_addr;
    wire [1:0] cpu_vram_wdata;

    // 單步執行脈衝產生器 (若 SW[1]=1 則用按鍵 pulse_drop 單步，若 SW[1]=0 則依定時時鐘運行)
    reg [21:0] cpu_clk_div;
    always @(posedge CLOCK_50 or negedge sys_rst_n) begin
        if (!sys_rst_n) cpu_clk_div <= 22'd0;
        else            cpu_clk_div <= cpu_clk_div + 1'b1;
    end
    wire cpu_exec_pulse = SW[1] ? pulse_drop : (cpu_clk_div == 22'd0);

    // SW[9:2] 為手動指令注入，SW[17] 切換手動指令或自主循環
    wire [7:0] cpu_instruction = SW[17] ? SW[9:2] : {cpu_pc[5:4], cpu_pc[3:2], cpu_pc[1:0], 2'b10};

    taixuan_cpu u_cpu (
        .clk        (CLOCK_50),
        .rst_n      (sys_rst_n),
        .exec_en    (cpu_exec_pulse),
        .inst_in    (cpu_instruction),
        .vram_we    (cpu_vram_we),
        .vram_addr  (cpu_vram_addr),
        .vram_wdata (cpu_vram_wdata),
        .vram_rdata (vram_dout_a),
        .pc         (cpu_pc),
        .shou_index (cpu_shou_idx),
        .acc        (cpu_acc),
        .flags      (cpu_flags)
    );

    // ========================================================================
    // 顯存 A 端口多路選擇器 (SW[17] 切換: 0 為方塊模式，1 為 CPU 寫入模式)
    // ========================================================================
    assign vram_we_a   = SW[17] ? cpu_vram_we   : tetris_vram_we;
    assign vram_addr_a = SW[17] ? cpu_vram_addr : tetris_vram_addr;
    assign vram_din_a  = SW[17] ? cpu_vram_wdata: tetris_vram_wdata;

    // ========================================================================
    // 6. VGA 時序與 9x9 顯存渲染流水線
    // ========================================================================
    wire        video_on;
    wire [9:0]  pixel_x;
    wire [9:0]  pixel_y;

    vga_sync_gen u_vga_sync (
        .clk_25m   (clk_25m),
        .rst_n     (sys_rst_n),
        .hsync     (VGA_HS),
        .vsync     (VGA_VS),
        .video_on  (video_on),
        .pixel_x   (pixel_x),
        .pixel_y   (pixel_y),
        .vga_blank (VGA_BLANK),
        .vga_sync  (VGA_SYNC)
    );

    vga_render_9x9 u_vga_render (
        .clk_25m   (clk_25m),
        .video_on  (video_on),
        .pixel_x   (pixel_x),
        .pixel_y   (pixel_y),
        .vram_addr (vram_addr_b),
        .vram_dout (vram_dout_b),
        .vga_r     (VGA_R),
        .vga_g     (VGA_G),
        .vga_b     (VGA_B)
    );

    // ========================================================================
    // 7. 七段數碼管 (HEX0 ~ HEX7) 儀表盤解碼
    // ========================================================================
    // HEX1-HEX0: 顯示目前首序 (1~81 號卦象)
    wire [7:0] shou_val = cpu_shou_idx;
    seg7_decoder u_hex0 (.hex_digit(shou_val[3:0]),        .blank(1'b0), .seg(HEX0));
    seg7_decoder u_hex1 (.hex_digit({1'b0, shou_val[6:4]}), .blank(1'b0), .seg(HEX1));

    // HEX3-HEX2: 顯示消除行數 (Lines)
    seg7_decoder u_hex2 (.hex_digit(lines_cleared[3:0]), .blank(1'b0), .seg(HEX2));
    seg7_decoder u_hex3 (.hex_digit(lines_cleared[7:4]), .blank(1'b0), .seg(HEX3));

    // HEX7-HEX4: 顯示遊戲得分 (Score, 16-bit Hex)
    seg7_decoder u_hex4 (.hex_digit(game_score[3:0]),   .blank(1'b0), .seg(HEX4));
    seg7_decoder u_hex5 (.hex_digit(game_score[7:4]),   .blank(1'b0), .seg(HEX5));
    seg7_decoder u_hex6 (.hex_digit(game_score[11:8]),  .blank(1'b0), .seg(HEX6));
    seg7_decoder u_hex7 (.hex_digit(game_score[15:12]), .blank(1'b0), .seg(HEX7));

    // ========================================================================
    // 8. LED 狀態指示燈
    // ========================================================================
    assign LEDG[6:0] = cpu_pc;          // 綠燈 6~0: 程式計數器 PC
    assign LEDG[7]   = game_over;       // 綠燈 7: 遊戲結束標誌
    assign LEDG[8]   = video_on;        // 綠燈 8: VGA 掃描中

    assign LEDR[7:0]   = cpu_acc;       // 紅燈 7~0: 累加器 4-Trit 值
    assign LEDR[10:8]  = cpu_flags;     // 紅燈 10~8: 旗標 (Carry, IsZero, IsHeaven)
    assign LEDR[17:11] = SW[17:11];     // 紅燈 17~11: 開關狀態回顯

endmodule
