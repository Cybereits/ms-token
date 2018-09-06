pragma solidity ^0.4.24;

import "./KnowYourCustomer.sol";
import "./Token.sol";
import "./Ownable.sol";

contract AssetToken is Token, Ownable {
    string public name;
    string public symbol;

    uint public decimals;
    uint public fee = 0;

    KnowYourCustomer kyc;

    address public chargeAddress = msg.sender;

    constructor(uint256 total, uint token_decimals, string token_name, string token_symbol, address kyc_ref) public {
        decimals = token_decimals;
        uint256 multiplier = 10 ** decimals;
        supply = mul(total, multiplier);
        balances[msg.sender] = supply;
        name = token_name;
        symbol = token_symbol;
        kyc = KnowYourCustomer(kyc_ref);
    }

    function changeChargeAddress(address addr) public onlyOwner {
        chargeAddress = addr;
    }

    function changeFee(uint charge_fee) public onlyOwner returns (uint current_fee) {
        fee = charge_fee;
        return fee;
    }

    function transfer(address addr_to, uint amount) public returns (bool ok) {
        require(kyc.isVerified(addr_to), "Destination address is invalid");
        require(amount <= balances[msg.sender], "Balance not enough");
        require(balances[addr_to] < add(balances[addr_to], amount), "Value is invalid");

        if (fee != 0 && msg.sender != owner) {
            uint256 feeShouldTake = div(mul(amount, fee), 10000);
            balances[addr_to] = add(balanceOf(addr_to), sub(amount, feeShouldTake));
            balances[chargeAddress] = add(balanceOf(chargeAddress), feeShouldTake);
            balances[msg.sender] = sub(balanceOf(msg.sender), amount);
            emit Transfer(msg.sender, addr_to, amount);
        } else {
            balances[addr_to] = add(balanceOf(addr_to), amount);
            balances[msg.sender] = sub(balanceOf(msg.sender), amount);
            emit Transfer(msg.sender, addr_to, amount);
        }

        return true;
    }

    function transferFrom(address addr_from, address addr_to, uint amount) public returns (bool ok) {
        require(kyc.isVerified(addr_from), "Origin address is invalid");
        require(kyc.isVerified(addr_to), "Destination address is invalid");
        require(amount <= balanceOf(addr_from), "Balance not enough");
        require(amount <= approvals[addr_from][msg.sender], "Approval balance is not enough");

        if (fee != 0 && addr_from != owner) {
            uint256 feeShouldTake = div(mul(amount, fee), 10000);
            balances[addr_to] = add(balanceOf(addr_to), sub(amount, feeShouldTake));
            balances[chargeAddress] = add(balanceOf(chargeAddress), feeShouldTake);
            balances[addr_from] = sub(balanceOf(addr_from), amount);
            approvals[addr_from][msg.sender] = sub(approvals[addr_from][msg.sender], amount);
            emit Transfer(msg.sender, addr_to, amount);
        } else {
            balances[addr_to] = add(balanceOf(addr_to), amount);
            balances[addr_from] = sub(balanceOf(addr_from), amount);
            approvals[addr_from][msg.sender] = sub(approvals[addr_from][msg.sender], amount);
            emit Transfer(addr_from, addr_to, amount);
        }

        return true;
    }
}
