pragma solidity ^0.4.18;

contract ERC20 {
    function totalSupply() public view returns (uint supply);
    function balanceOf(address owner ) public view returns (uint value);
    function allowance(address owner, address spender ) public view returns (uint _allowance);

    function transfer(address to, uint value) public returns (bool ok);
    function transferFrom(address from, address to, uint value) public returns (bool ok);
    function approve(address spender, uint value ) public returns (bool ok);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}
