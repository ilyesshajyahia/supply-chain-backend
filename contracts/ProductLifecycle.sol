// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./RolesManager.sol";
import "./ProductRegistry.sol";

contract ProductLifecycle {
    RolesManager public rolesManager;
    ProductRegistry public productRegistry;

    enum LifecycleStage {
        None,
        Manufactured,
        Retail,
        Resold,
        Purchased
    }

    struct EventItem {
        LifecycleStage stage;
        address actor;
        uint256 timestamp;
        string location;
    }

    mapping(uint256 => EventItem[]) private productEvents;
    mapping(uint256 => LifecycleStage) public currentStage;
    mapping(uint256 => bool) public isSold;

    event LifecycleEventAdded(
        uint256 indexed productID,
        LifecycleStage indexed stage,
        address indexed actor,
        uint256 timestamp,
        string location
    );

    constructor(address rolesManagerAddress, address productRegistryAddress) {
        require(rolesManagerAddress != address(0), "Invalid roles manager");
        require(productRegistryAddress != address(0), "Invalid registry");

        rolesManager = RolesManager(rolesManagerAddress);
        productRegistry = ProductRegistry(productRegistryAddress);
    }

    modifier productExists(uint256 productID) {
        require(productRegistry.exists(productID), "Product does not exist");
        _;
    }

    modifier notFinalized(uint256 productID) {
        require(!isSold[productID], "Product already sold and immutable");
        _;
    }

    function addEvent(
        uint256 productID,
        string calldata eventType,
        string calldata location
    ) external productExists(productID) notFinalized(productID) {
        bytes32 e = keccak256(bytes(eventType));

        if (e == keccak256("Manufactured")) {
            _handleManufactured(productID, location);
            return;
        }
        if (e == keccak256("Retail")) {
            _handleRetail(productID, location);
            return;
        }
        if (e == keccak256("Resold")) {
            _handleResold(productID, location);
            return;
        }
        if (e == keccak256("Purchased")) {
            _handlePurchased(productID, location);
            return;
        }

        revert("Invalid eventType");
    }

    function getEvents(uint256 productID) external view returns (EventItem[] memory) {
        return productEvents[productID];
    }

    function _handleManufactured(uint256 productID, string calldata location) internal {
        require(rolesManager.isManufacturer(msg.sender), "Not manufacturer");
        require(currentStage[productID] == LifecycleStage.None, "Manufactured must be first event");

        _push(productID, LifecycleStage.Manufactured, location);
    }

    function _handleRetail(uint256 productID, string calldata location) internal {
        require(rolesManager.isRetailer(msg.sender), "Not retailer");
        require(currentStage[productID] == LifecycleStage.Manufactured, "Retail must follow Manufactured");

        _push(productID, LifecycleStage.Retail, location);
    }

    function _handleResold(uint256 productID, string calldata location) internal {
        require(rolesManager.isReseller(msg.sender), "Not reseller");
        require(currentStage[productID] == LifecycleStage.Retail, "Resold must follow Retail");

        _push(productID, LifecycleStage.Resold, location);
    }

    function _handlePurchased(uint256 productID, string calldata location) internal {
        require(rolesManager.isReseller(msg.sender), "Not reseller");
        require(currentStage[productID] == LifecycleStage.Resold, "Purchased must follow Resold");

        _push(productID, LifecycleStage.Purchased, location);
        isSold[productID] = true;
    }

    function _push(uint256 productID, LifecycleStage stage, string calldata location) internal {
        productEvents[productID].push(
            EventItem({
                stage: stage,
                actor: msg.sender,
                timestamp: block.timestamp,
                location: location
            })
        );

        currentStage[productID] = stage;

        emit LifecycleEventAdded(productID, stage, msg.sender, block.timestamp, location);
    }
}
