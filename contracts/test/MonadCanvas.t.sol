// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface Vm {
    function warp(uint256) external;
    function prank(address) external;
    function expectRevert() external;
    function expectEmit(bool, bool, bool, bool) external;
}

contract Test {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
}

import "../src/MonadCanvas.sol";

contract MonadCanvasTest is Test {
    MonadCanvas public canvas;
    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);

    event PixelMutated(
        uint8 indexed x,
        uint8 indexed y,
        bytes3 color,
        address indexed mutator,
        string prompt,
        uint256 timestamp
    );

    function setUp() public {
        canvas = new MonadCanvas();
    }

    function test_InitialState() public view {
        assert(canvas.CANVAS_SIZE() == 32);
        assert(canvas.TOTAL_PIXELS() == 1024);
        assert(canvas.totalMutations() == 0);
    }

    function test_MutateSinglePixel() public {
        vm.prank(alice);
        bytes3 purple = 0x836EF9;
        string memory prompt = "Monad purple glow";

        canvas.mutatePixel(10, 15, purple, prompt);

        (MonadCanvas.Pixel memory pixel, string memory storedPrompt) = canvas.getPixel(10, 15);
        assert(pixel.owner == alice);
        assert(pixel.color == purple);
        assert(keccak256(bytes(storedPrompt)) == keccak256(bytes(prompt)));
        assert(canvas.totalMutations() == 1);
    }

    function test_RevertInvalidCoordinates() public {
        vm.expectRevert();
        canvas.mutatePixel(32, 0, 0xFFFFFF, "Out of bounds");

        vm.expectRevert();
        canvas.mutatePixel(0, 32, 0xFFFFFF, "Out of bounds");
    }

    function test_MutateBatchPixels() public {
        vm.prank(bob);

        uint8[] memory xs = new uint8[](3);
        uint8[] memory ys = new uint8[](3);
        bytes3[] memory colors = new bytes3[](3);
        string[] memory prompts = new string[](3);

        xs[0] = 0; ys[0] = 0; colors[0] = 0xFF0000; prompts[0] = "Red corner";
        xs[1] = 16; ys[1] = 16; colors[1] = 0x00FF00; prompts[1] = "Green center";
        xs[2] = 31; ys[2] = 31; colors[2] = 0x0000FF; prompts[2] = "Blue corner";

        canvas.mutatePixelBatch(xs, ys, colors, prompts);

        assert(canvas.totalMutations() == 3);

        (MonadCanvas.Pixel memory p0,) = canvas.getPixel(0, 0);
        assert(p0.owner == bob);
        assert(p0.color == 0xFF0000);

        (MonadCanvas.Pixel memory p1,) = canvas.getPixel(16, 16);
        assert(p1.owner == bob);
        assert(p1.color == 0x00FF00);

        (MonadCanvas.Pixel memory p2,) = canvas.getPixel(31, 31);
        assert(p2.owner == bob);
        assert(p2.color == 0x0000FF);
    }

    function test_GetCanvasState() public {
        canvas.mutatePixel(5, 5, 0x123456, "P1");
        canvas.mutatePixel(10, 10, 0xABCDEF, "P2");

        (bytes3[1024] memory colors, address[1024] memory owners) = canvas.getCanvasState();

        uint16 idx1 = 5 * 32 + 5;
        uint16 idx2 = 10 * 32 + 10;

        assert(colors[idx1] == 0x123456);
        assert(owners[idx1] == address(this));

        assert(colors[idx2] == 0xABCDEF);
        assert(owners[idx2] == address(this));
    }
}
