// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AnchorRegistry {
    address public owner;
    bytes32 public latestRoot;
    uint256 public latestBatchId;

    struct Batch {
        bytes32 merkleRoot;
        uint256 fromEventIndex;
        uint256 toEventIndex;
        uint256 eventCount;
        uint256 anchoredAt;
        address anchoredBy;
    }

    mapping(uint256 => Batch) public batches;

    event RootAnchored(
        uint256 indexed batchId,
        bytes32 indexed merkleRoot,
        uint256 fromEventIndex,
        uint256 toEventIndex,
        uint256 eventCount,
        address anchoredBy
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }

    function anchorBatch(
        bytes32 merkleRoot,
        uint256 fromEventIndex,
        uint256 toEventIndex,
        uint256 eventCount
    ) public onlyOwner {
        require(merkleRoot != bytes32(0), "Invalid root");
        require(eventCount > 0, "Invalid count");
        require(toEventIndex >= fromEventIndex, "Invalid range");

        latestBatchId += 1;
        latestRoot = merkleRoot;
        batches[latestBatchId] = Batch({
            merkleRoot: merkleRoot,
            fromEventIndex: fromEventIndex,
            toEventIndex: toEventIndex,
            eventCount: eventCount,
            anchoredAt: block.timestamp,
            anchoredBy: msg.sender
        });

        emit RootAnchored(
            latestBatchId,
            merkleRoot,
            fromEventIndex,
            toEventIndex,
            eventCount,
            msg.sender
        );
    }

    function anchorRoot(bytes32 merkleRoot) external onlyOwner {
        anchorBatch(merkleRoot, 0, 0, 1);
    }
}
