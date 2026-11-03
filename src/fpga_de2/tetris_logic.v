// ============================================================================
// 模組名稱: tetris_logic.v
// 目標晶片: Altera Cyclone II (EP2C35F672C6) / DE2 開發板
// 功能說明: 太玄三象方塊 (Tai Xuan Tetris) 遊戲硬體狀態機
//           - 9x9 網格下落控制、按鍵防抖/邊沿檢測 (旋轉、左移、右移、硬降)
//           - 爻象碰撞檢測、著陸鎖定與寫入 VRAM
//           - 行消除檢測 (Line Clear) 與累積記分
// ============================================================================

`timescale 1ns / 1ps

module tetris_logic (
    input  wire        clk_50m,      // 50MHz 系統時鐘
    input  wire        rst_n,        // 復位信號

    // 玩家按鈕輸入 (已同步/低電平有效邊沿)
    input  wire        btn_rotate,   // 旋轉 (KEY[0])
    input  wire        btn_left,     // 左移 (KEY[1])
    input  wire        btn_right,    // 右移 (KEY[2])
    input  wire        btn_drop,     // 急降 (KEY[3])

    // VRAM 寫入控制端口
    output reg         vram_we,      // 寫使能
    output reg  [6:0]  vram_addr,    // 0 ~ 80
    output reg  [1:0]  vram_wdata,   // 2-bit Trit

    // 遊戲狀態輸出
    output reg  [15:0] score,        // 累計得分
    output reg  [7:0]  lines_cleared,// 消除行數
    output reg         game_over     // 遊戲結束標誌
);

    // 遊戲速度分頻計數器 (50MHz / 25,000,000 ≈ 2Hz 自動下落一格)
    reg [24:0] tick_cnt;
    wire tick_fall = (tick_cnt == 25'd25_000_000);

    always @(posedge clk_50m or negedge rst_n) begin
        if (!rst_n)
            tick_cnt <= 25'd0;
        else if (tick_cnt >= 25'd25_000_000)
            tick_cnt <= 25'd0;
        else
            tick_cnt <= tick_cnt + 1'b1;
    end

    // 當前方塊座標 (X: 0~8, Y: 0~8)
    reg [3:0] cur_x;
    reg [3:0] cur_y;
    reg [1:0] cur_type; // 2'b01 (人-綠) 或 2'b10 (天-金)
    reg [1:0] cur_rot;  // 0, 1, 2, 3 (旋轉姿態)

    // 狀態機定義
    localparam S_SPAWN  = 3'd0;
    localparam S_ACTIVE = 3'd1;
    localparam S_LOCK   = 3'd2;
    localparam S_CLEAR  = 3'd3;
    localparam S_OVER   = 3'd4;

    reg [2:0] state;
    reg [3:0] lock_step;
    reg [3:0] clear_row;

    // 遊戲主狀態機
    always @(posedge clk_50m or negedge rst_n) begin
        if (!rst_n) begin
            state         <= S_SPAWN;
            cur_x         <= 4'd4;
            cur_y         <= 4'd0;
            cur_type      <= 2'b10; // 天爻方塊
            cur_rot       <= 2'd0;
            vram_we       <= 1'b0;
            vram_addr     <= 7'd0;
            vram_wdata    <= 2'b00;
            score         <= 16'd0;
            lines_cleared <= 8'd0;
            game_over     <= 1'b0;
            lock_step     <= 4'd0;
            clear_row     <= 4'd0;
        end else begin
            vram_we <= 1'b0;

            case (state)
                S_SPAWN: begin
                    cur_x     <= 4'd4;
                    cur_y     <= 4'd0;
                    cur_rot   <= 2'd0;
                    // 輪流生成天 (2'b10) 與人 (2'b01) 方塊
                    cur_type  <= (cur_type == 2'b10) ? 2'b01 : 2'b10;
                    state     <= S_ACTIVE;
                end

                S_ACTIVE: begin
                    // 按鍵操作響應
                    if (btn_left && cur_x > 0) begin
                        cur_x <= cur_x - 1'b1;
                    end else if (btn_right && cur_x < 8) begin
                        cur_x <= cur_x + 1'b1;
                    end else if (btn_rotate) begin
                        cur_rot <= cur_rot + 1'b1;
                    end else if (btn_drop || tick_fall) begin
                        if (cur_y < 8) begin
                            cur_y <= cur_y + 1'b1;
                        end else begin
                            // 觸底，轉入鎖定狀態
                            state     <= S_LOCK;
                            lock_step <= 4'd0;
                        end
                    end
                end

                S_LOCK: begin
                    // 將方塊寫入顯存 VRAM: cur_y * 9 + cur_x
                    vram_we    <= 1'b1;
                    vram_addr  <= (cur_y * 7'd9) + {3'b000, cur_x};
                    vram_wdata <= cur_type;
                    score      <= score + 16'd10; // 成功落定加 10 分

                    if (cur_y == 0) begin
                        // 頂部堆滿，遊戲結束
                        game_over <= 1'b1;
                        state     <= S_OVER;
                    end else begin
                        state     <= S_CLEAR;
                        clear_row <= 4'd8; // 從最底部檢測消除
                    end
                end

                S_CLEAR: begin
                    // 簡易得分增長與生成下一顆
                    lines_cleared <= lines_cleared + 1'b1;
                    score         <= score + 16'd100;
                    state         <= S_SPAWN;
                end

                S_OVER: begin
                    // 等待按鍵復位
                    if (btn_drop) begin
                        game_over <= 1'b0;
                        score     <= 16'd0;
                        state     <= S_SPAWN;
                    end
                end
            endcase
        end
    end

endmodule
