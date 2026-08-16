// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MonadCanvas
 * @notice A high-performance, collaborative 32x32 pixel canvas built specifically for Monad.
 * @dev Optimized for Monad's parallel EVM execution and storage gas model.
 *      Each pixel's core data (owner, color, timestamp) is packed tightly into a single
 *      27-byte slot (within a 32-byte storage word) to avoid multiple cold storage slot loads.
 */
contract MonadCanvas {
    // ── Constants ──
    uint8 public constant CANVAS_SIZE = 64;
    uint16 public constant TOTAL_PIXELS = 4096; // 64 * 64

    // ── Structs ──
    /**
     * @notice Packed pixel representation fitting in 1 storage slot:
     * - address owner: 20 bytes
     * - bytes3 color: 3 bytes (Hex RGB e.g. #836EF9 -> 0x836EF9)
     * - uint32 lastModified: 4 bytes (Unix epoch seconds)
     * Total = 27 bytes (packed within 32 bytes)
     */
    struct Pixel {
        address owner;
        bytes3 color;
        uint32 lastModified;
    }

    // ── State Variables ──
    // Flat array mapping 0..1023 (index = y * 32 + x)
    mapping(uint16 => Pixel) private _pixels;
    mapping(uint16 => string) private _pixelPrompts;

    uint256 public totalMutations;
    address public immutable deployer;

    // ── Events ──
    event PixelMutated(
        uint8 indexed x,
        uint8 indexed y,
        bytes3 color,
        address indexed mutator,
        string prompt,
        uint256 timestamp
    );

    event BatchPixelMutated(
        uint256 count,
        address indexed mutator,
        uint256 timestamp
    );

    // ── Errors ──
    error InvalidCoordinates(uint8 x, uint8 y);
    error ArrayLengthMismatch();
    error EmptyBatch();

    constructor() {
        deployer = msg.sender;
    }

    // ── Core Mutation Functions ──

    /**
     * @notice Mutates a single pixel at (x, y) with a color and optional prompt.
     * @param x X coordinate (0 to 31)
     * @param y Y coordinate (0 to 31)
     * @param color 3-byte RGB hex code (e.g. 0x836EF9)
     * @param prompt Descriptive text or AI prompt for the pixel evolution
     */
    function mutatePixel(
        uint8 x,
        uint8 y,
        bytes3 color,
        string calldata prompt
    ) external {
        if (x >= CANVAS_SIZE || y >= CANVAS_SIZE) {
            revert InvalidCoordinates(x, y);
        }

        uint16 index = _toIndex(x, y);

        _pixels[index] = Pixel({
            owner: msg.sender,
            color: color,
            lastModified: uint32(block.timestamp)
        });

        if (bytes(prompt).length > 0) {
            _pixelPrompts[index] = prompt;
        }

        unchecked {
            totalMutations++;
        }

        emit PixelMutated(x, y, color, msg.sender, prompt, block.timestamp);
    }

    /**
     * @notice Batch mutates multiple pixels in a single gas-efficient transaction.
     * @param xs Array of X coordinates
     * @param ys Array of Y coordinates
     * @param colors Array of 3-byte RGB colors
     * @param prompts Array of prompts for each pixel
     */
    function mutatePixelBatch(
        uint8[] calldata xs,
        uint8[] calldata ys,
        bytes3[] calldata colors,
        string[] calldata prompts
    ) external {
        uint256 length = xs.length;
        if (length == 0) revert EmptyBatch();
        if (ys.length != length || colors.length != length || prompts.length != length) {
            revert ArrayLengthMismatch();
        }

        uint32 currentTimestamp = uint32(block.timestamp);

        for (uint256 i = 0; i < length;) {
            uint8 x = xs[i];
            uint8 y = ys[i];

            if (x >= CANVAS_SIZE || y >= CANVAS_SIZE) {
                revert InvalidCoordinates(x, y);
            }

            uint16 index = _toIndex(x, y);
            bytes3 color = colors[i];
            string calldata prompt = prompts[i];

            _pixels[index] = Pixel({
                owner: msg.sender,
                color: color,
                lastModified: currentTimestamp
            });

            if (bytes(prompt).length > 0) {
                _pixelPrompts[index] = prompt;
            }

            emit PixelMutated(x, y, color, msg.sender, prompt, currentTimestamp);

            unchecked {
                ++i;
            }
        }

        unchecked {
            totalMutations += length;
        }

        emit BatchPixelMutated(length, msg.sender, block.timestamp);
    }

    // ── View Functions ──

    /**
     * @notice Returns the full details for a pixel at (x, y).
     * @param x X coordinate (0 to 31)
     * @param y Y coordinate (0 to 31)
     */
    function getPixel(uint8 x, uint8 y) external view returns (Pixel memory pixel, string memory prompt) {
        if (x >= CANVAS_SIZE || y >= CANVAS_SIZE) {
            revert InvalidCoordinates(x, y);
        }
        uint16 index = _toIndex(x, y);
        return (_pixels[index], _pixelPrompts[index]);
    }

    /**
     * @notice Returns all 4,096 pixel colors and owners in a single RPC call for fast UI hydration.
     * @return colors Array of 4,096 RGB bytes3 colors
     * @return owners Array of 4,096 owner addresses
     */
    function getCanvasState() external view returns (bytes3[4096] memory colors, address[4096] memory owners) {
        for (uint16 i = 0; i < TOTAL_PIXELS;) {
            Pixel storage p = _pixels[i];
            colors[i] = p.color;
            owners[i] = p.owner;
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Converts (x, y) coordinates to flat array index.
     */
    function _toIndex(uint8 x, uint8 y) internal pure returns (uint16) {
        return uint16(y) * uint16(CANVAS_SIZE) + uint16(x);
    }
}
