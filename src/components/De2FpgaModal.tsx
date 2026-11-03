/**
 * DE2 Cyclone II (EP2C35F672C6) Verilog & QSF Hardware Synthesis Modal
 * Provides full Verilog sources, pin assignments, and Quartus 13.0 SP1 guides.
 * @license Apache-2.0
 */

import React, { useState } from 'react';

interface De2FpgaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SourceFile {
  name: string;
  desc: string;
  code: string;
}

export const De2FpgaModal: React.FC<De2FpgaModalProps> = ({ isOpen, onClose }) => {
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);

  if (!isOpen) return null;

  const files: SourceFile[] = [
    {
      name: 'de2_taixuan_top.v',
      desc: '頂層模組：整合時鐘、按鍵去抖、VRAM、CPU、方塊邏輯與 ADV7123 VGA',
      code: `// ============================================================================
// 模組名稱: de2_taixuan_top.v
// 目標板卡: Altera DE2 Board (Cyclone II EP2C35F672C6)
// 功能說明: 《太玄三進制微機與三象方塊》頂層硬體整合模組
// ============================================================================

\`timescale 1ns / 1ps

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

    // 1. 系統復位與時鐘管理
    wire sys_rst_n = ~SW[0];
    wire clk_25m;

    pll_25m u_pll (
        .clk_50m (CLOCK_50),
        .rst_n   (sys_rst_n),
        .clk_25m (clk_25m)
    );

    assign VGA_CLK = clk_25m;

    // 2. 按鍵邊沿檢測 (KEY[3:0] 低電平有效)
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

    wire pulse_rot   = (key_d2[0] == 1'b1 && key_d1[0] == 1'b0); // KEY[0]: 旋轉
    wire pulse_left  = (key_d2[1] == 1'b1 && key_d1[1] == 1'b0); // KEY[1]: 左移
    wire pulse_right = (key_d2[2] == 1'b1 && key_d1[2] == 1'b0); // KEY[2]: 右移
    wire pulse_drop  = (key_d2[3] == 1'b1 && key_d1[3] == 1'b0); // KEY[3]: 急降

    // 3. 雙端口 81-Trit (9x9) 顯存 (VRAM)
    wire [6:0] vram_addr_a;
    wire [1:0] vram_din_a;
    wire       vram_we_a;
    wire [1:0] vram_dout_a;

    wire [6:0] vram_addr_b;
    wire [1:0] vram_dout_b;

    taixuan_vram u_vram (
        .clk    (CLOCK_50),
        .rst_n  (sys_rst_n),
        .addr_a (vram_addr_a),
        .din_a  (vram_din_a),
        .we_a   (vram_we_a),
        .dout_a (vram_dout_a),
        .addr_b (vram_addr_b),
        .dout_b (vram_dout_b)
    );

    // 4. 太玄俄羅斯方塊遊戲引擎
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

    // 5. 太玄 81 首微處理器核心
    wire [6:0] cpu_pc;
    wire [6:0] cpu_shou_idx;
    wire [7:0] cpu_acc;
    wire [2:0] cpu_flags;
    wire       cpu_vram_we;
    wire [6:0] cpu_vram_addr;
    wire [1:0] cpu_vram_wdata;

    reg [21:0] cpu_clk_div;
    always @(posedge CLOCK_50 or negedge sys_rst_n) begin
        if (!sys_rst_n) cpu_clk_div <= 22'd0;
        else            cpu_clk_div <= cpu_clk_div + 1'b1;
    end
    wire cpu_exec_pulse = SW[1] ? pulse_drop : (cpu_clk_div == 22'd0);
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

    assign vram_we_a   = SW[17] ? cpu_vram_we   : tetris_vram_we;
    assign vram_addr_a = SW[17] ? cpu_vram_addr : tetris_vram_addr;
    assign vram_din_a  = SW[17] ? cpu_vram_wdata: tetris_vram_wdata;

    // 6. VGA 時序與渲染
    wire        video_on;
    wire [9:0]  pixel_x, pixel_y;

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

    // 7. 七段數碼管儀表盤
    wire [7:0] shou_val = cpu_shou_idx;
    seg7_decoder u_hex0 (.hex_digit(shou_val[3:0]),         .blank(1'b0), .seg(HEX0));
    seg7_decoder u_hex1 (.hex_digit({1'b0, shou_val[6:4]}), .blank(1'b0), .seg(HEX1));
    seg7_decoder u_hex2 (.hex_digit(lines_cleared[3:0]),    .blank(1'b0), .seg(HEX2));
    seg7_decoder u_hex3 (.hex_digit(lines_cleared[7:4]),    .blank(1'b0), .seg(HEX3));
    seg7_decoder u_hex4 (.hex_digit(game_score[3:0]),      .blank(1'b0), .seg(HEX4));
    seg7_decoder u_hex5 (.hex_digit(game_score[7:4]),      .blank(1'b0), .seg(HEX5));
    seg7_decoder u_hex6 (.hex_digit(game_score[11:8]),     .blank(1'b0), .seg(HEX6));
    seg7_decoder u_hex7 (.hex_digit(game_score[15:12]),    .blank(1'b0), .seg(HEX7));

    // 8. LED 狀態指示
    assign LEDG[6:0]   = cpu_pc;
    assign LEDG[7]     = game_over;
    assign LEDG[8]     = video_on;
    assign LEDR[7:0]   = cpu_acc;
    assign LEDR[10:8]  = cpu_flags;
    assign LEDR[17:11] = SW[17:11];

endmodule`,
    },
    {
      name: 'pll_25m.v',
      desc: '時鐘除頻：將 DE2 板載 50MHz 轉換為 25MHz VGA 畫素時鐘',
      code: `\`timescale 1ns / 1ps

module pll_25m (
    input  wire clk_50m,    // DE2 板載 50MHz
    input  wire rst_n,     // 異步低電平復位
    output reg  clk_25m     // 25MHz 畫素時鐘
);

    always @(posedge clk_50m or negedge rst_n) begin
        if (!rst_n)
            clk_25m <= 1'b0;
        else
            clk_25m <= ~clk_25m; // 50MHz / 2 = 25.0MHz
    end

endmodule`,
    },
    {
      name: 'taixuan_vram.v',
      desc: '雙端口顯存：81-Trit (9x9 格點) 顯存，支援 CPU 讀寫與 VGA 並行無爭搶掃描',
      code: `\`timescale 1ns / 1ps

module taixuan_vram (
    input  wire        clk,
    input  wire        rst_n,

    // A 端口: 遊戲引擎與 CPU 讀寫
    input  wire [6:0]  addr_a,
    input  wire [1:0]  din_a,
    input  wire        we_a,
    output reg  [1:0]  dout_a,

    // B 端口: VGA 掃描讀取
    input  wire [6:0]  addr_b,
    output reg  [1:0]  dout_b
);

    reg [1:0] mem [0:80];
    integer i;

    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            for (i = 0; i < 81; i = i + 1)
                mem[i] <= 2'b00; // 復位為地 (0)
        end else if (we_a && (addr_a < 7'd81)) begin
            mem[addr_a] <= din_a;
        end
    end

    always @(posedge clk) begin
        dout_a <= (addr_a < 7'd81) ? mem[addr_a] : 2'b00;
        dout_b <= (addr_b < 7'd81) ? mem[addr_b] : 2'b00;
    end

endmodule`,
    },
    {
      name: 'taixuan_cpu.v',
      desc: 'CPU 核心：81 首指令解碼器、三進制加減與 Min/Max 運算、累加器與旗標',
      code: `\`timescale 1ns / 1ps

module taixuan_cpu (
    input  wire        clk,
    input  wire        rst_n,
    input  wire        exec_en,
    input  wire [7:0]  inst_in,

    output reg         vram_we,
    output reg  [6:0]  vram_addr,
    output reg  [1:0]  vram_wdata,
    input  wire [1:0]  vram_rdata,

    output reg  [6:0]  pc,
    output wire [6:0]  shou_index,
    output reg  [7:0]  acc,
    output reg  [2:0]  flags
);

    wire [1:0] trit_fang = inst_in[7:6];
    wire [1:0] trit_zhou = inst_in[5:4];
    wire [1:0] trit_bu   = inst_in[3:2];
    wire [1:0] trit_jia  = inst_in[1:0];

    assign shou_index = (trit_fang * 7'd27) + (trit_zhou * 7'd9) + (trit_bu * 7'd3) + {5'd0, trit_jia} + 7'd1;

    function [1:0] t_not;
        input [1:0] t;
        case (t)
            2'b00: t_not = 2'b10;
            2'b01: t_not = 2'b01;
            2'b10: t_not = 2'b00;
            default: t_not = 2'b00;
        endcase
    endfunction

    function [1:0] t_min;
        input [1:0] a, b;
        t_min = (a < b) ? a : b;
    endfunction

    function [1:0] t_max;
        input [1:0] a, b;
        t_max = (a > b) ? a : b;
    endfunction

    function [2:0] t_add1;
        input [1:0] a, b, c_in;
        reg [2:0] total;
        begin
            total = a + b + c_in;
            t_add1 = (total >= 3) ? {1'b1, total - 3'd3} : {1'b0, total[1:0]};
        end
    endfunction

    wire [2:0] add0 = t_add1(acc[1:0], trit_jia,  1'b0);
    wire [2:0] add1 = t_add1(acc[3:2], trit_bu,   add0[2]);
    wire [2:0] add2 = t_add1(acc[5:4], trit_zhou, add1[2]);
    wire [2:0] add3 = t_add1(acc[7:6], trit_fang, add2[2]);

    wire is_zero   = (acc == 8'b00000000);
    wire is_heaven = (acc == 8'b10101010);

    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            pc <= 7'd0; acc <= 8'b0; flags <= 3'b0; vram_we <= 1'b0;
        end else if (exec_en) begin
            vram_we <= 1'b0;
            if (shou_index <= 7'd9) begin
                acc <= {add3[1:0], add2[1:0], add1[1:0], add0[1:0]};
                flags <= {add3[2], is_zero, is_heaven};
            end else if (shou_index <= 7'd18) begin
                acc <= {t_not(acc[7:6]), t_not(acc[5:4]), t_not(acc[3:2]), t_not(acc[1:0])};
            end else if (shou_index <= 7'd27) begin
                acc <= {t_min(acc[7:6], trit_fang), t_min(acc[5:4], trit_zhou), t_min(acc[3:2], trit_bu), t_min(acc[1:0], trit_jia)};
            end else if (shou_index <= 7'd36) begin
                acc <= {t_max(acc[7:6], trit_fang), t_max(acc[5:4], trit_zhou), t_max(acc[3:2], trit_bu), t_max(acc[1:0], trit_jia)};
            end else if (shou_index <= 7'd45) begin
                acc <= {t_not(acc[7:6]), t_not(acc[5:4]), t_not(acc[3:2]), t_not(acc[1:0])};
            end else if (shou_index <= 7'd54) begin
                acc <= {acc[5:0], acc[7:6]};
            end else if (shou_index <= 7'd63) begin
                vram_we <= 1'b1; vram_addr <= pc; vram_wdata <= acc[1:0];
            end else if (shou_index <= 7'd72) begin
                if (is_zero) pc <= {1'b0, inst_in[5:0]};
            end else begin
                acc <= inst_in;
            end
            pc <= (pc == 7'd80) ? 7'd0 : pc + 1'b1;
        end
    end

endmodule`,
    },
    {
      name: 'tetris_logic.v',
      desc: '遊戲狀態機：按鍵偵測、方塊下落、碰撞著陸、行消除判定與記分',
      code: `\`timescale 1ns / 1ps

module tetris_logic (
    input  wire        clk_50m,
    input  wire        rst_n,
    input  wire        btn_rotate,
    input  wire        btn_left,
    input  wire        btn_right,
    input  wire        btn_drop,

    output reg         vram_we,
    output reg  [6:0]  vram_addr,
    output reg  [1:0]  vram_wdata,

    output reg  [15:0] score,
    output reg  [7:0]  lines_cleared,
    output reg         game_over
);

    reg [24:0] tick_cnt;
    wire tick_fall = (tick_cnt == 25'd25_000_000);

    always @(posedge clk_50m or negedge rst_n) begin
        if (!rst_n) tick_cnt <= 25'd0;
        else if (tick_cnt >= 25'd25_000_000) tick_cnt <= 25'd0;
        else tick_cnt <= tick_cnt + 1'b1;
    end

    reg [3:0] cur_x, cur_y;
    reg [1:0] cur_type;
    reg [2:0] state;

    always @(posedge clk_50m or negedge rst_n) begin
        if (!rst_n) begin
            state <= 3'd0; cur_x <= 4'd4; cur_y <= 4'd0; cur_type <= 2'b10;
            vram_we <= 1'b0; score <= 16'd0; lines_cleared <= 8'd0; game_over <= 1'b0;
        end else begin
            vram_we <= 1'b0;
            case (state)
                3'd0: begin // SPAWN
                    cur_x <= 4'd4; cur_y <= 4'd0;
                    cur_type <= (cur_type == 2'b10) ? 2'b01 : 2'b10;
                    state <= 3'd1;
                end
                3'd1: begin // ACTIVE
                    if (btn_left && cur_x > 0) cur_x <= cur_x - 1'b1;
                    else if (btn_right && cur_x < 8) cur_x <= cur_x + 1'b1;
                    else if (btn_drop || tick_fall) begin
                        if (cur_y < 8) cur_y <= cur_y + 1'b1;
                        else state <= 3'd2; // LOCK
                    end
                end
                3'd2: begin // LOCK
                    vram_we <= 1'b1;
                    vram_addr <= (cur_y * 7'd9) + {3'b000, cur_x};
                    vram_wdata <= cur_type;
                    score <= score + 16'd10;
                    if (cur_y == 0) begin game_over <= 1'b1; state <= 3'd4; end
                    else state <= 3'd3;
                end
                3'd3: begin // CLEAR
                    lines_cleared <= lines_cleared + 1'b1;
                    score <= score + 16'd100;
                    state <= 3'd0;
                end
                3'd4: begin // OVER
                    if (btn_drop) begin game_over <= 1'b0; score <= 16'd0; state <= 3'd0; end
                end
            endcase
        end
    end

endmodule`,
    },
    {
      name: 'vga_sync_gen.v',
      desc: 'VGA 行場同步：標準 640x480 @ 60Hz 脈衝時序產生器與 ADV7123 消隱信號',
      code: `\`timescale 1ns / 1ps

module vga_sync_gen (
    input  wire        clk_25m,
    input  wire        rst_n,
    output reg         hsync,
    output reg         vsync,
    output reg         video_on,
    output reg  [9:0]  pixel_x,
    output reg  [9:0]  pixel_y,
    output wire        vga_blank,
    output wire        vga_sync
);

    localparam H_ACTIVE = 10'd640, H_FRONT = 10'd16, H_SYNC = 10'd96, H_TOTAL = 10'd800;
    localparam V_ACTIVE = 10'd480, V_FRONT = 10'd10, V_SYNC = 10'd2,  V_TOTAL = 10'd525;

    reg [9:0] h_cnt, v_cnt;

    always @(posedge clk_25m or negedge rst_n) begin
        if (!rst_n) begin
            h_cnt <= 10'd0; v_cnt <= 10'd0;
        end else if (h_cnt == H_TOTAL - 1) begin
            h_cnt <= 10'd0;
            v_cnt <= (v_cnt == V_TOTAL - 1) ? 10'd0 : v_cnt + 1'b1;
        end else begin
            h_cnt <= h_cnt + 1'b1;
        end
    end

    always @(posedge clk_25m or negedge rst_n) begin
        if (!rst_n) begin
            hsync <= 1'b1; vsync <= 1'b1; video_on <= 1'b0;
        end else begin
            hsync <= ~(h_cnt >= (H_ACTIVE + H_FRONT) && h_cnt < (H_ACTIVE + H_FRONT + H_SYNC));
            vsync <= ~(v_cnt >= (V_ACTIVE + V_FRONT) && v_cnt < (V_ACTIVE + V_FRONT + V_SYNC));
            video_on <= (h_cnt < H_ACTIVE && v_cnt < V_ACTIVE);
            pixel_x <= (h_cnt < H_ACTIVE) ? h_cnt : 10'd0;
            pixel_y <= (v_cnt < V_ACTIVE) ? v_cnt : 10'd0;
        end
    end

    assign vga_blank = video_on;
    assign vga_sync  = 1'b0;

endmodule`,
    },
    {
      name: 'vga_render_9x9.v',
      desc: '畫面渲染模組：將 9x9 VRAM 居中放大為 324x324 像素，輸出 ADV7123 10-bit 色彩',
      code: `\`timescale 1ns / 1ps

module vga_render_9x9 (
    input  wire        clk_25m,
    input  wire        video_on,
    input  wire [9:0]  pixel_x,
    input  wire [9:0]  pixel_y,

    output reg  [6:0]  vram_addr,
    input  wire [1:0]  vram_dout,

    output reg  [9:0]  vga_r,
    output reg  [9:0]  vga_g,
    output reg  [9:0]  vga_b
);

    localparam BOARD_X_START = 10'd158, BOARD_X_END = 10'd482;
    localparam BOARD_Y_START = 10'd78,  BOARD_Y_END = 10'd402;

    wire in_board = (pixel_x >= BOARD_X_START && pixel_x < BOARD_X_END &&
                     pixel_y >= BOARD_Y_START && pixel_y < BOARD_Y_END);

    wire [9:0] rel_x = in_board ? (pixel_x - BOARD_X_START) : 10'd0;
    wire [9:0] rel_y = in_board ? (pixel_y - BOARD_Y_START) : 10'd0;

    reg [3:0] col, row;
    reg [5:0] cell_sub_x, cell_sub_y;

    always @(*) begin
        if      (rel_x < 36)  begin col = 4'd0; cell_sub_x = rel_x; end
        else if (rel_x < 72)  begin col = 4'd1; cell_sub_x = rel_x - 36; end
        else if (rel_x < 108) begin col = 4'd2; cell_sub_x = rel_x - 72; end
        else if (rel_x < 144) begin col = 4'd3; cell_sub_x = rel_x - 108; end
        else if (rel_x < 180) begin col = 4'd4; cell_sub_x = rel_x - 144; end
        else if (rel_x < 216) begin col = 4'd5; cell_sub_x = rel_x - 180; end
        else if (rel_x < 252) begin col = 4'd6; cell_sub_x = rel_x - 216; end
        else if (rel_x < 288) begin col = 4'd7; cell_sub_x = rel_x - 252; end
        else                  begin col = 4'd8; cell_sub_x = rel_x - 288; end

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

    always @(*) begin
        vram_addr = in_board ? ((row * 7'd9) + {3'b000, col}) : 7'd0;
    end

    wire is_cell_border = (cell_sub_x <= 1 || cell_sub_x >= 34 || cell_sub_y <= 1 || cell_sub_y >= 34);

    always @(posedge clk_25m) begin
        if (!video_on) begin
            vga_r <= 10'd0; vga_g <= 10'd0; vga_b <= 10'd0;
        end else if (in_board) begin
            if (is_cell_border) begin
                vga_r <= 10'd180; vga_g <= 10'd200; vga_b <= 10'd225; // 邊框灰
            end else begin
                case (vram_dout)
                    2'b00: begin vga_r <= 10'd55;  vga_g <= 10'd65;  vga_b <= 10'd85;  end // 地: 暗黑
                    2'b01: begin vga_r <= 10'd64;  vga_g <= 10'd740; vga_b <= 10'd516; end // 人: 翡翠
                    2'b10: begin vga_r <= 10'd980; vga_g <= 10'd630; vga_b <= 10'd60;  end // 天: 金黃
                    default: begin vga_r <= 10'd0; vga_g <= 10'd0; vga_b <= 10'd0; end
                endcase
            end
        end else begin
            vga_r <= 10'd35; vga_g <= 10'd42; vga_b <= 10'd58; // 背景墨黑
        end
    end

endmodule`,
    },
    {
      name: 'seg7_decoder.v',
      desc: '7 段數碼管解碼：4-bit 轉 DE2 Active-Low 陰極 (HEX0~HEX7)',
      code: `\`timescale 1ns / 1ps

module seg7_decoder (
    input  wire [3:0] hex_digit,
    input  wire       blank,
    output reg  [6:0] seg
);

    always @(*) begin
        if (blank) begin
            seg = 7'b1111111;
        end else begin
            case (hex_digit)
                4'h0: seg = 7'b1000000;
                4'h1: seg = 7'b1111001;
                4'h2: seg = 7'b0100100;
                4'h3: seg = 7'b0110000;
                4'h4: seg = 7'b0011001;
                4'h5: seg = 7'b0010010;
                4'h6: seg = 7'b0000010;
                4'h7: seg = 7'b1111000;
                4'h8: seg = 7'b0000000;
                4'h9: seg = 7'b0010000;
                4'hA: seg = 7'b0001000;
                4'hB: seg = 7'b0000011;
                4'hC: seg = 7'b1000110;
                4'hD: seg = 7'b0100001;
                4'hE: seg = 7'b0000110;
                4'hF: seg = 7'b0001110;
                default: seg = 7'b1111111;
            endcase
        end
    end

endmodule`,
    },
    {
      name: 'de2_taixuan.qsf',
      desc: 'Quartus 設定檔：包含 Cyclone II EP2C35F672C6 全部引腳分配 (Pin Assignments)',
      code: `# ============================================================================
# Quartus Settings File (QSF) for Altera DE2 Board
# Target Device: Cyclone II EP2C35F672C6
# Project: de2_taixuan_top
# ============================================================================

set_global_assignment -name FAMILY "Cyclone II"
set_global_assignment -name DEVICE EP2C35F672C6
set_global_assignment -name TOP_LEVEL_ENTITY de2_taixuan_top

# 50 MHz Clock
set_location_assignment PIN_N2 -to CLOCK_50

# KEY[3:0]
set_location_assignment PIN_G26 -to KEY[0]
set_location_assignment PIN_N23 -to KEY[1]
set_location_assignment PIN_P23 -to KEY[2]
set_location_assignment PIN_W26 -to KEY[3]

# SW[17:0]
set_location_assignment PIN_N25 -to SW[0]
set_location_assignment PIN_N26 -to SW[1]
set_location_assignment PIN_P25 -to SW[2]
set_location_assignment PIN_AE14 -to SW[3]
set_location_assignment PIN_AF14 -to SW[4]
set_location_assignment PIN_AD13 -to SW[5]
set_location_assignment PIN_AC13 -to SW[6]
set_location_assignment PIN_C13 -to SW[7]
set_location_assignment PIN_B13 -to SW[8]
set_location_assignment PIN_A13 -to SW[9]
set_location_assignment PIN_N1 -to SW[10]
set_location_assignment PIN_P1 -to SW[11]
set_location_assignment PIN_P2 -to SW[12]
set_location_assignment PIN_T7 -to SW[13]
set_location_assignment PIN_U3 -to SW[14]
set_location_assignment PIN_U4 -to SW[15]
set_location_assignment PIN_V1 -to SW[16]
set_location_assignment PIN_V2 -to SW[17]

# 7-Segment Displays (HEX0 ~ HEX7)
set_location_assignment PIN_AF10 -to HEX0[0]
set_location_assignment PIN_AB12 -to HEX0[1]
set_location_assignment PIN_AC12 -to HEX0[2]
set_location_assignment PIN_AD11 -to HEX0[3]
set_location_assignment PIN_AE11 -to HEX0[4]
set_location_assignment PIN_V14 -to HEX0[5]
set_location_assignment PIN_V13 -to HEX0[6]

set_location_assignment PIN_V20 -to HEX1[0]
set_location_assignment PIN_V21 -to HEX1[1]
set_location_assignment PIN_W21 -to HEX1[2]
set_location_assignment PIN_Y22 -to HEX1[3]
set_location_assignment PIN_AA24 -to HEX1[4]
set_location_assignment PIN_AA23 -to HEX1[5]
set_location_assignment PIN_AB24 -to HEX1[6]

set_location_assignment PIN_AB23 -to HEX2[0]
set_location_assignment PIN_V22 -to HEX2[1]
set_location_assignment PIN_AC25 -to HEX2[2]
set_location_assignment PIN_AC26 -to HEX2[3]
set_location_assignment PIN_AB26 -to HEX2[4]
set_location_assignment PIN_AB25 -to HEX2[5]
set_location_assignment PIN_Y24 -to HEX2[6]

set_location_assignment PIN_Y23 -to HEX3[0]
set_location_assignment PIN_AA25 -to HEX3[1]
set_location_assignment PIN_AA26 -to HEX3[2]
set_location_assignment PIN_Y26 -to HEX3[3]
set_location_assignment PIN_Y25 -to HEX3[4]
set_location_assignment PIN_U22 -to HEX3[5]
set_location_assignment PIN_W24 -to HEX3[6]

set_location_assignment PIN_U9 -to HEX4[0]
set_location_assignment PIN_U1 -to HEX4[1]
set_location_assignment PIN_U2 -to HEX4[2]
set_location_assignment PIN_T4 -to HEX4[3]
set_location_assignment PIN_R7 -to HEX4[4]
set_location_assignment PIN_R6 -to HEX4[5]
set_location_assignment PIN_T3 -to HEX4[6]

set_location_assignment PIN_T2 -to HEX5[0]
set_location_assignment PIN_P6 -to HEX5[1]
set_location_assignment PIN_P7 -to HEX5[2]
set_location_assignment PIN_T9 -to HEX5[3]
set_location_assignment PIN_R5 -to HEX5[4]
set_location_assignment PIN_R4 -to HEX5[5]
set_location_assignment PIN_R3 -to HEX5[6]

set_location_assignment PIN_R2 -to HEX6[0]
set_location_assignment PIN_P4 -to HEX6[1]
set_location_assignment PIN_P3 -to HEX6[2]
set_location_assignment PIN_M9 -to HEX6[3]
set_location_assignment PIN_M8 -to HEX6[4]
set_location_assignment PIN_M7 -to HEX6[5]
set_location_assignment PIN_M6 -to HEX6[6]

set_location_assignment PIN_M5 -to HEX7[0]
set_location_assignment PIN_M4 -to HEX7[1]
set_location_assignment PIN_M3 -to HEX7[2]
set_location_assignment PIN_M2 -to HEX7[3]
set_location_assignment PIN_K9 -to HEX7[4]
set_location_assignment PIN_K8 -to HEX7[5]
set_location_assignment PIN_K7 -to HEX7[6]

# ADV7123 VGA
set_location_assignment PIN_B8 -to VGA_CLK
set_location_assignment PIN_A7 -to VGA_HS
set_location_assignment PIN_D8 -to VGA_VS
set_location_assignment PIN_D6 -to VGA_BLANK
set_location_assignment PIN_B7 -to VGA_SYNC

set_location_assignment PIN_C8 -to VGA_R[0]
set_location_assignment PIN_F10 -to VGA_R[1]
set_location_assignment PIN_G10 -to VGA_R[2]
set_location_assignment PIN_D9 -to VGA_R[3]
set_location_assignment PIN_D10 -to VGA_R[4]
set_location_assignment PIN_E10 -to VGA_R[5]
set_location_assignment PIN_H10 -to VGA_R[6]
set_location_assignment PIN_J10 -to VGA_R[7]
set_location_assignment PIN_J11 -to VGA_R[8]
set_location_assignment PIN_H12 -to VGA_R[9]

set_location_assignment PIN_B9 -to VGA_G[0]
set_location_assignment PIN_A9 -to VGA_G[1]
set_location_assignment PIN_C10 -to VGA_G[2]
set_location_assignment PIN_D10 -to VGA_G[3]
set_location_assignment PIN_B10 -to VGA_G[4]
set_location_assignment PIN_A10 -to VGA_G[5]
set_location_assignment PIN_G11 -to VGA_G[6]
set_location_assignment PIN_D11 -to VGA_G[7]
set_location_assignment PIN_E12 -to VGA_G[8]
set_location_assignment PIN_D12 -to VGA_G[9]

set_location_assignment PIN_J13 -to VGA_B[0]
set_location_assignment PIN_J14 -to VGA_B[1]
set_location_assignment PIN_F14 -to VGA_B[2]
set_location_assignment PIN_G15 -to VGA_B[3]
set_location_assignment PIN_E15 -to VGA_B[4]
set_location_assignment PIN_F15 -to VGA_B[5]
set_location_assignment PIN_H15 -to VGA_B[6]
set_location_assignment PIN_J15 -to VGA_B[7]
set_location_assignment PIN_B11 -to VGA_B[8]
set_location_assignment PIN_B12 -to VGA_B[9]

# LEDs
set_location_assignment PIN_AE22 -to LEDG[0]
set_location_assignment PIN_AF22 -to LEDG[1]
set_location_assignment PIN_W19 -to LEDG[2]
set_location_assignment PIN_V18 -to LEDG[3]
set_location_assignment PIN_U18 -to LEDG[4]
set_location_assignment PIN_U17 -to LEDG[5]
set_location_assignment PIN_AA20 -to LEDG[6]
set_location_assignment PIN_Y18 -to LEDG[7]
set_location_assignment PIN_Y12 -to LEDG[8]

set_location_assignment PIN_AE23 -to LEDR[0]
set_location_assignment PIN_AF23 -to LEDR[1]
set_location_assignment PIN_AB21 -to LEDR[2]
set_location_assignment PIN_AC22 -to LEDR[3]
set_location_assignment PIN_AD22 -to LEDR[4]
set_location_assignment PIN_AD23 -to LEDR[5]
set_location_assignment PIN_AD21 -to LEDR[6]
set_location_assignment PIN_AC21 -to LEDR[7]
set_location_assignment PIN_AA14 -to LEDR[8]
set_location_assignment PIN_Y13 -to LEDR[9]
set_location_assignment PIN_AA13 -to LEDR[10]
set_location_assignment PIN_AC14 -to LEDR[11]
set_location_assignment PIN_AD15 -to LEDR[12]
set_location_assignment PIN_AE15 -to LEDR[13]
set_location_assignment PIN_AF13 -to LEDR[14]
set_location_assignment PIN_AE13 -to LEDR[15]
set_location_assignment PIN_AE12 -to LEDR[16]
set_location_assignment PIN_AD12 -to LEDR[17]`,
    },
  ];

  const handleCopy = (filename: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedFile(filename);
    setTimeout(() => setCopiedFile(null), 2500);
  };

  const handleDownload = (filename: string, code: string) => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const activeFile = files[activeFileIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-amber-500/10 text-amber-500 rounded-lg text-lg">⚡</span>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Altera DE2 (Cyclone II) 硬體燒錄套件
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-mono">
                  EP2C35F672C6
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                完整 8 個 Verilog 模組 + 1 個 Quartus QSF 引腳分配，即貼即燒
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Quick Guide Ribbon */}
        <div className="px-6 py-2.5 bg-amber-500/5 border-b border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold">⚠️ 工具鏈提醒：</span>
            <span>Cyclone II 請務必使用 <b>Quartus II 13.0 SP1 (Web Edition)</b>（後續新版本已移除支援）。</span>
          </div>
          <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
            資源消耗: ~1,500 LEs (4.5%) / 1 PLL / 1 M4K
          </div>
        </div>

        {/* Content Body: Sidebar + Code Viewer */}
        <div className="flex-1 flex overflow-hidden">
          {/* File Sidebar */}
          <div className="w-64 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 overflow-y-auto p-3 space-y-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
              工程文件清單 ({files.length})
            </div>
            {files.map((file, idx) => (
              <button
                key={file.name}
                type="button"
                onClick={() => setActiveFileIndex(idx)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-all flex flex-col gap-0.5 ${
                  activeFileIndex === idx
                    ? 'bg-sky-600 text-white font-semibold shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/60'
                }`}
              >
                <span className="truncate">{file.name}</span>
                <span className={`text-[10px] truncate ${activeFileIndex === idx ? 'text-sky-100' : 'text-slate-400'}`}>
                  {file.desc.split('：')[0]}
                </span>
              </button>
            ))}
          </div>

          {/* Code Viewer Panel */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 text-slate-100">
            {/* Toolbar */}
            <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-sky-400">{activeFile.name}</span>
                <span className="text-[11px] text-slate-400">({activeFile.desc})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(activeFile.name, activeFile.code)}
                  className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5"
                >
                  {copiedFile === activeFile.name ? (
                    <>
                      <span className="text-emerald-400">✓</span> 已複製
                    </>
                  ) : (
                    <>
                      <span>📋</span> 複製代碼
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload(activeFile.name, activeFile.code)}
                  className="px-2.5 py-1 text-xs font-medium rounded-md bg-sky-600 hover:bg-sky-500 text-white transition-colors flex items-center gap-1.5"
                >
                  <span>⬇️</span> 下載檔案
                </button>
              </div>
            </div>

            {/* Code Content */}
            <pre className="flex-1 p-4 font-mono text-xs overflow-auto leading-relaxed text-slate-200 select-all">
              <code>{activeFile.code}</code>
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 flex items-center justify-between text-xs text-slate-500">
          <div>
            燒錄步驟：1. 建立工程 ➔ 2. 加入上述 Verilog 檔案 ➔ 3. 匯入 QSF ➔ 4. Compile Design ➔ 5. Program Device
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium transition-colors"
          >
            關閉視窗
          </button>
        </div>
      </div>
    </div>
  );
};
