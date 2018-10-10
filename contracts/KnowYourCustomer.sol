pragma solidity ^0.4.24;

import "./Ownable.sol";

contract KnowYourCustomer is Ownable {

    string public name;
    enum Status { Invalid, Valid, Frozen }

    mapping(address => Status) internal white_list;
    mapping(address => string) internal vt_set;

    event Freeze(address addr);
    event Unfreeze(address addr);
    event Verified(address addr);
    event WriteValidationToken(address addr, string token);

    constructor(string _name) public {
        name = _name;
        white_list[msg.sender] = Status.Valid;
    }

    function saveVT(string token) public {
        require(white_list[msg.sender] != Status.Valid, "Address has already been verified");
        require(white_list[msg.sender] != Status.Frozen, "Address has been frozen");
        vt_set[msg.sender] = token;
        white_list[msg.sender] = Status.Invalid;
        emit WriteValidationToken(msg.sender, token);
    }

    function queryToken() public view returns (string token) {
        return vt_set[msg.sender];
    }

    function queryTokenFor(address addr) public view onlyOwner returns (string token) {
        return vt_set[addr];
    }

    function verify(address addr) public onlyOwner {
        white_list[addr] = Status.Valid;
        delete vt_set[addr];
        emit Verified(addr);
    }

    function freeze(address addr) public onlyOwner {
        white_list[addr] = Status.Frozen;
        emit Freeze(addr);
    }

    function unfreeze(address addr) public onlyOwner {
        white_list[addr] = Status.Invalid;
        emit Unfreeze(addr);
    }

    function isVerified(address addr) public view returns(bool) {
        return white_list[addr] == Status.Valid;
    }

    function kill() public onlyOwner {
        selfdestruct(owner);
    }
}
