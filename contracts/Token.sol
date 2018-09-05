pragma solidity ^0.4.18;

import "./SafeMath.sol";
import "./ERC20.sol";

contract Token is ERC20, SafeMath {
    uint256 public supply;
    mapping(address => uint256) public balances;
    mapping (address => mapping (address => uint256)) public approvals;

    function balanceOf(address owner) public view returns (uint256 balance) {
        return balances[owner];
    }

    function allowance(address owner, address spender) public view returns (uint256) {
        return approvals[owner][spender];
    }

    function transfer(address _to, uint256 _value) public returns (bool) {
        require(_value <= balances[msg.sender], "Balance not enough for transfer");
        require(balances[_to] < add(balances[_to], _value), "Transfer value is invalid");

        balances[msg.sender] = sub(balances[msg.sender], _value);
        balances[_to] = add(balances[_to], _value);

        emit Transfer(msg.sender, _to, _value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        require(balances[from] >= value, "Balance not enough for transfer");
        require(approvals[from][msg.sender] >= value, "Balance not enough for transfer");

        approvals[from][msg.sender] = sub(approvals[from][msg.sender], value);
        balances[from] = sub(balances[from], value);
        balances[to] = add(balances[to], value);

        emit Transfer(from, to, value);

        return true;
    }

    function approve(address spender, uint256 value) public returns (bool) {
        approvals[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function totalSupply() public view returns (uint) {
        return supply;
    }
}
