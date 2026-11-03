// ============================================================================
// 模組名稱: seg7_decoder.v
// 目標晶片: Altera Cyclone II (EP2C35F672C6) / DE2 開發板
// 功能說明: 4-bit 二進制/十六進制轉 DE2 七段數碼管 (Active-Low 低電平點亮)
//           - seg[0]: a, seg[1]: b, seg[2]: c, seg[3]: d
//           - seg[4]: e, seg[5]: f, seg[6]: g
// ============================================================================

`timescale 1ns / 1ps

module seg7_decoder (
    input  wire [3:0] hex_digit,   // 4-bit 數值 (0x0 ~ 0xF)
    input  wire       blank,       // 消隱控制 (1: 全熄滅)
    output reg  [6:0] seg          // 7段輸出 (g f e d c b a)
);

    always @(*) begin
        if (blank) begin
            seg = 7'b1111111; // 全滅
        end else begin
            case (hex_digit)
                4'h0: seg = 7'b1000000; // 0
                4'h1: seg = 7'b1111001; // 1
                4'h2: seg = 7'b0100100; // 2
                4'h3: seg = 7'b0110000; // 3
                4'h4: seg = 7'b0011001; // 4
                4'h5: seg = 7'b0010010; // 5
                4'h6: seg = 7'b0000010; // 6
                4'h7: seg = 7'b1111000; // 7
                4'h8: seg = 7'b0000000; // 8
                4'h9: seg = 7'b0010000; // 9
                4'hA: seg = 7'b0001000; // A
                4'hB: seg = 7'b0000011; // b
                4'hC: seg = 7'b1000110; // C
                4'hD: seg = 7'b0100001; // d
                4'hE: seg = 7'b0000110; // E
                4'hF: seg = 7'b0001110; // F
                default: seg = 7'b1111111;
            endcase
        end
    end

endmodule
