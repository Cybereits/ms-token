pragma solidity ^0.4.18;

import "./KnowYourCustomer.sol";
import "./Token.sol";
import "./Ownable.sol";

contract AssetToken is Token, Ownable {
    string public name;
    string public symbol;

    uint public decimals;
    uint public fee = 0;

    KnowYourCustomer kyc;

    address public migrationMaster = msg.sender;
    address public chargeAddress = msg.sender;

    constructor(uint256 total, uint _decimals, string _name, string _symbol, address _kycContractAddress) public {
        decimals = _decimals;
        uint256 multiplier = 10 ** decimals;
        supply = mul(total, multiplier);
        balances[msg.sender] = supply;
        name = _name;
        symbol = _symbol;
        kyc = KnowYourCustomer(_kycContractAddress);
    }

    function changeChargeAddress(address _addr) public onlyOwner {
        chargeAddress = _addr;
    }

    function changeFee(uint256 _fee) public onlyOwner returns (uint256) {
        fee = _fee;
        return fee;
    }

    function transfer(address _to, uint _value) public returns (bool ok) {
        require(kyc.isVerified(_to), "Destination address does not in white list yet");
        require(_value <= balances[msg.sender], "Balance not enough");
        require(balances[_to] < add(balances[_to], _value), "Value is invalid");

        if (fee != 0 && msg.sender != migrationMaster ) {
            uint256 feeShouldTake = mul(_value, fee) / 10000;
            balances[_to] = add(balanceOf(_to), sub(_value, feeShouldTake));
            balances[chargeAddress] = add(balanceOf(chargeAddress), feeShouldTake);
            balances[msg.sender] = sub(balanceOf(msg.sender), _value);
            emit Transfer(msg.sender, _to, _value);
        } else {
            balances[_to] = add(balanceOf(_to), _value);
            balances[msg.sender] = sub(balanceOf(msg.sender), _value);
            emit Transfer(msg.sender, _to, _value);
        }

        return true;
    }

    function transferFrom(address _from, address _to, uint _value) public returns (bool) {
        assert(kyc.isVerified(_from) && kyc.isVerified(_to));
        assert(balanceOf(_from) >= _value);
        assert(approvals[_from][msg.sender] >= _value);

        if (fee != 0 && _from != migrationMaster ) {
            uint256 feeShouldTake = mul(_value, fee) / 10000;
            balances[_to] = add(balanceOf(_to), sub(_value, feeShouldTake));
            balances[chargeAddress] = add(balanceOf(chargeAddress), feeShouldTake);
            balances[_from] = sub(balanceOf(_from), _value);
            approvals[_from][msg.sender] = sub(approvals[_from][msg.sender], _value);
            emit Transfer(msg.sender, _to, _value);
        } else {
            balances[_to] = add(balanceOf(_to), _value);
            balances[_from] = sub(balanceOf(_from), _value);
            approvals[_from][msg.sender] = sub(approvals[_from][msg.sender], _value);
            emit Transfer(_from, _to, _value);
        }

        return true;
    }
}
