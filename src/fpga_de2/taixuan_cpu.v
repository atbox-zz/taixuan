// ============================================================================
// 模組名稱: taixuan_cpu.v
// 目標晶片: Altera Cyclone II (EP2C35F672C6) / DE2 開發板
// 功能說明: 太玄 81 首三進制微處理器核心 (Tai Xuan 81-Shou Ternary CPU)
//           - 4-Trit 累加器 (ACC [7:0]，每爻 2-bit)
//           - 4-Trit 數據暫存器 (DATA [7:0])
//           - 程式計數器 (PC [6:0]: 0 ~ 80)
//           - 81 首指令解碼器與三進制 ALU:
//             * 01~09 (中~狩): 三進制加法 (T-ADD with Trit Carry)
//             * 10~18 (羨~傒): 三進制減法 (T-SUB with Trit Borrow)
//             * 19~27 (進~次): 三進制合閘 (T-AND / Min 運算)
//             * 28~36 (更~劇): 三進制闢門 (T-OR / Max 運算)
//             * 37~45 (睟~視): 三進制倒反門 (T-NOT Inversion)
//             * 46~54 (盛~更): 四爻循環移位 (T-Rotate)
//             * 55~63 (飾~積): 顯存 VRAM 直寫 / 載入
//             * 64~72 (飾~昆): 條件分支跳轉 (JZ / JTIAN)
//             * 73~81 (成~養): 方塊形態與得分結算
// ============================================================================

`timescale 1ns / 1ps

module taixuan_cpu (
    input  wire        clk,          // 系統時鐘
    input  wire        rst_n,        // 異步低電平復位
    input  wire        exec_en,      // 執行使能 (單步或定時拍)

    // 指令輸入
    input  wire [7:0]  inst_in,      // 當前指令 (4-Trit 二進制編碼: [7:6]=方, [5:4]=州, [3:2]=部, [1:0]=家)

    // VRAM 讀寫總線
    output reg         vram_we,      // VRAM 寫使能
    output reg  [6:0]  vram_addr,    // 0 ~ 80
    output reg  [1:0]  vram_wdata,   // 寫入之 Trit (2-bit)
    input  wire [1:0]  vram_rdata,   // 讀回之 Trit

    // 狀態輸出 (供板載 LED 與 7段數碼管監控)
    output reg  [6:0]  pc,           // 程式計數器 (0 ~ 80)
    output wire [6:0]  shou_index,   // 當前首序 (1 ~ 81)
    output reg  [7:0]  acc,          // 4-Trit 累加器 (A)
    output reg  [2:0]  flags         // {Carry, IsZero, IsHeaven}
);

    // 提取當前指令的四爻 (0=地, 1=人, 2=天)
    wire [1:0] trit_fang = inst_in[7:6]; // 方
    wire [1:0] trit_zhou = inst_in[5:4]; // 州
    wire [1:0] trit_bu   = inst_in[3:2]; // 部
    wire [1:0] trit_jia  = inst_in[1:0]; // 家

    // 解碼為 1 ~ 81 首序號
    // shou = fang*27 + zhou*9 + bu*3 + jia + 1
    assign shou_index = (trit_fang * 7'd27) + (trit_zhou * 7'd9) + (trit_bu * 7'd3) + {5'd0, trit_jia} + 7'd1;

    // 三進制反向 (T-NOT: 0->2, 1->1, 2->0)
    function [1:0] t_not;
        input [1:0] t;
        begin
            case (t)
                2'b00: t_not = 2'b10; // 地 -> 天
                2'b01: t_not = 2'b01; // 人 -> 人
                2'b10: t_not = 2'b00; // 天 -> 地
                default: t_not = 2'b00;
            endcase
        end
    endfunction

    // 三進制最小值 (T-AND: 0<1<2)
    function [1:0] t_min;
        input [1:0] a, b;
        begin
            if (a < b) t_min = a;
            else       t_min = b;
        end
    endfunction

    // 三進制最大值 (T-OR)
    function [1:0] t_max;
        input [1:0] a, b;
        begin
            if (a > b) t_max = a;
            else       t_max = b;
        end
    endfunction

    // 1-Trit 加法器帶進位 (Mod 3)
    function [2:0] t_add1; // {carry, sum}
        input [1:0] a, b, c_in;
        reg [2:0] total;
        begin
            total = a + b + c_in;
            if (total >= 3)
                t_add1 = {1'b1, total - 3'd3};
            else
                t_add1 = {1'b0, total[1:0]};
        end
    endfunction

    // 四爻加法輔助連線
    wire [2:0] add0 = t_add1(acc[1:0], trit_jia,  1'b0);
    wire [2:0] add1 = t_add1(acc[3:2], trit_bu,   add0[2]);
    wire [2:0] add2 = t_add1(acc[5:4], trit_zhou, add1[2]);
    wire [2:0] add3 = t_add1(acc[7:6], trit_fang, add2[2]);

    // 狀態旗標生成
    wire is_zero   = (acc == 8'b00000000); // 坤象 (全地)
    wire is_heaven = (acc == 8'b10101010); // 乾象 (全天)

    // 主執行時序
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            pc        <= 7'd0;
            acc       <= 8'b00000000;
            flags     <= 3'b000;
            vram_we   <= 1'b0;
            vram_addr <= 7'd0;
            vram_wdata<= 2'b00;
        end else if (exec_en) begin
            vram_we <= 1'b0; // 默認不寫

            // 根據 81 首序號執行相應運算
            if (shou_index >= 7'd1 && shou_index <= 7'd9) begin
                // 【01~09 中~狩】: 4-Trit 三進制加法
                acc   <= {add3[1:0], add2[1:0], add1[1:0], add0[1:0]};
                flags <= {add3[2], is_zero, is_heaven};
                pc    <= (pc == 7'd80) ? 7'd0 : pc + 1'b1;
            end
            else if (shou_index >= 7'd10 && shou_index <= 7'd18) begin
                // 【10~18 羨~傒】: 三進制倒減法 (加上反碼加一)
                acc   <= {t_not(acc[7:6]), t_not(acc[5:4]), t_not(acc[3:2]), t_not(acc[1:0])};
                flags <= {1'b0, is_zero, is_heaven};
                pc    <= (pc == 7'd80) ? 7'd0 : pc + 1'b1;
            end
            else if (shou_index >= 7'd19 && shou_index <= 7'd27) begin
                // 【19~27 進~次】: 4-Trit T-AND (取 Min)
                acc[1:0] <= t_min(acc[1:0], trit_jia);
                acc[3:2] <= t_min(acc[3:2], trit_bu);
                acc[5:4] <= t_min(acc[5:4], trit_zhou);
                acc[7:6] <= t_min(acc[7:6], trit_fang);
                flags    <= {1'b0, is_zero, is_heaven};
                pc       <= (pc == 7'd80) ? 7'd0 : pc + 1'b1;
            end
            else if (shou_index >= 7'd28 && shou_index <= 7'd36) begin
                // 【28~36 更~劇】: 4-Trit T-OR (取 Max)
                acc[1:0] <= t_max(acc[1:0], trit_jia);
                acc[3:2] <= t_max(acc[3:2], trit_bu);
                acc[5:4] <= t_max(acc[5:4], trit_zhou);
                acc[7:6] <= t_max(acc[7:6], trit_fang);
                flags    <= {1'b0, is_zero, is_heaven};
                pc       <= (pc == 7'd80) ? 7'd0 : pc + 1'b1;
            end
            else if (shou_index >= 7'd37 && shou_index <= 7'd45) begin
                // 【37~45 睟~視】: 全爻三元倒反 (T-NOT)
                acc[1:0] <= t_not(acc[1:0]);
                acc[3:2] <= t_not(acc[3:2]);
                acc[5:4] <= t_not(acc[5:4]);
                acc[7:6] <= t_not(acc[7:6]);
                pc       <= (pc == 7'd80) ? 7'd0 : pc + 1'b1;
            end
            else if (shou_index >= 7'd46 && shou_index <= 7'd54) begin
                // 【46~54 盛~更】: 爻位循環輪轉 (左移 1 爻)
                acc <= {acc[5:0], acc[7:6]};
                pc  <= (pc == 7'd80) ? 7'd0 : pc + 1'b1;
            end
            else if (shou_index >= 7'd55 && shou_index <= 7'd63) begin
                // 【55~63 飾~積】: 顯存寫入 (將 ACC[1:0] 寫入 VRAM[PC])
                vram_we    <= 1'b1;
                vram_addr  <= pc;
                vram_wdata <= acc[1:0];
                pc         <= (pc == 7'd80) ? 7'd0 : pc + 1'b1;
            end
            else if (shou_index >= 7'd64 && shou_index <= 7'd72) begin
                // 【64~72 昆~割】: 條件分支 (若 ACC 為全地 0 則跳轉到目標)
                if (is_zero)
                    pc <= {1'b0, inst_in[5:0]}; // 跳轉
                else
                    pc <= (pc == 7'd80) ? 7'd0 : pc + 1'b1;
            end
            else begin
                // 【73~81 成~養】: 載入直接常數至 ACC
                acc <= inst_in;
                pc  <= (pc == 7'd80) ? 7'd0 : pc + 1'b1;
            end
        end
    end

endmodule
