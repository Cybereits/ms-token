pragma solidity ^0.4.6;

import "./Ownable.sol";

contract KnowYourCustomer is Ownable {

    string public name;
    enum Status { Invalid, Valid, Frozen }

    /**
    * White List
    * ---
    * Addresses those passed the KYC verification
    */
    mapping(address => Status) internal white_list;

    /**
    * Valid-Token Set
    * ---
    * A valid token for this address will be added into this set
    * while this address is requesting the KYC verification.
    * Token is a number between 0 and 65536
    */
    mapping(address => uint16) internal vt_set;

    event Freeze(address addr);

    constructor(string _name) public {
        name = _name;
        white_list[msg.sender] = Status.Valid;
    }

    /**
    * Owner request a verification for address
    */
    function setValidToken(address addr, uint16 token) public onlyOwner {
        require(white_list[addr] != Status.Valid, "Address has already been verified");
        require(white_list[addr] != Status.Frozen, "Address has been frozen");
        require(vt_set[addr] == 0, "Address has already been allocated a valid token");
        vt_set[addr] = token;
    }

    /**
    * User need to query valid token for his address,
    * then wrote then valid token back to
    */
    function queryToken() public view returns (uint16 token) {
        return vt_set[msg.sender];
    }

    function queryTokenFor(address addr) public view onlyOwner returns (uint16 token) {
        return vt_set[addr];
    }

    function verify(address addr) public onlyOwner {
        white_list[addr] = Status.Valid;
        delete vt_set[addr];
    }

    function freeze(address addr) public onlyOwner {
        white_list[addr] = Status.Frozen;
        emit Freeze(addr);
    }

    function isVerified(address addr) public view returns(bool) {
        return white_list[addr] == Status.Valid;
    }

    function kill() public onlyOwner {
        selfdestruct(owner);
    }
}
