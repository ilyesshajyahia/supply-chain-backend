// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./RolesManager.sol";

contract ProductRegistry {
    RolesManager public rolesManager;

    struct Product {
        string name;
        address manufacturer;
        uint256 createdAt;
        bool exists;
    }

    mapping(uint256 => Product) public products;

    event ProductAdded(uint256 indexed productID, string name, address indexed manufacturer, uint256 createdAt);

    constructor(address rolesManagerAddress) {
        require(rolesManagerAddress != address(0), "Invalid roles manager");
        rolesManager = RolesManager(rolesManagerAddress);
    }

    modifier onlyManufacturer() {
        require(rolesManager.isManufacturer(msg.sender), "Not a manufacturer");
        _;
    }

    function addProduct(uint256 productID, string calldata name) external onlyManufacturer {
        require(!products[productID].exists, "Product already exists");
        require(bytes(name).length > 0, "Name required");

        products[productID] = Product({
            name: name,
            manufacturer: msg.sender,
            createdAt: block.timestamp,
            exists: true
        });

        emit ProductAdded(productID, name, msg.sender, block.timestamp);
    }

    function exists(uint256 productID) external view returns (bool) {
        return products[productID].exists;
    }

    function getProduct(uint256 productID) external view returns (string memory name, address manufacturer, uint256 createdAt) {
        require(products[productID].exists, "Product does not exist");
        Product storage p = products[productID];
        return (p.name, p.manufacturer, p.createdAt);
    }
}
