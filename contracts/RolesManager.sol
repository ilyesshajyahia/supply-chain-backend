// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RolesManager {
    address public owner;

    mapping(address => bool) public manufacturers;
    mapping(address => bool) public resellers;
    mapping(address => bool) public retailers;

    event OwnerTransferred(address indexed previousOwner, address indexed newOwner);
    event ManufacturerUpdated(address indexed account, bool enabled);
    event ResellerUpdated(address indexed account, bool enabled);
    event RetailerUpdated(address indexed account, bool enabled);

    constructor() {
        owner = msg.sender;
        manufacturers[msg.sender] = true;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        address previous = owner;
        owner = newOwner;
        emit OwnerTransferred(previous, newOwner);
    }

    function setManufacturer(address account, bool enabled) public onlyOwner {
        manufacturers[account] = enabled;
        emit ManufacturerUpdated(account, enabled);
    }

    function setReseller(address account, bool enabled) public onlyOwner {
        resellers[account] = enabled;
        emit ResellerUpdated(account, enabled);
    }

    function setRetailer(address account, bool enabled) public onlyOwner {
        retailers[account] = enabled;
        emit RetailerUpdated(account, enabled);
    }

    function addManufacturer(address account) external onlyOwner {
        setManufacturer(account, true);
    }

    function removeManufacturer(address account) external onlyOwner {
        setManufacturer(account, false);
    }

    function addReseller(address account) external onlyOwner {
        setReseller(account, true);
    }

    function removeReseller(address account) external onlyOwner {
        setReseller(account, false);
    }

    function addRetailer(address account) external onlyOwner {
        setRetailer(account, true);
    }

    function removeRetailer(address account) external onlyOwner {
        setRetailer(account, false);
    }

    function isManufacturer(address account) external view returns (bool) {
        return manufacturers[account];
    }

    function isReseller(address account) external view returns (bool) {
        return resellers[account];
    }

    function isRetailer(address account) external view returns (bool) {
        return retailers[account];
    }
}
