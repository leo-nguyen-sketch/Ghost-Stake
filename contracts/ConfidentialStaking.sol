// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";
import {IERC7984Receiver} from "@openzeppelin/confidential-contracts/interfaces/IERC7984Receiver.sol";
import {FHESafeMath} from "@openzeppelin/confidential-contracts/utils/FHESafeMath.sol";
import {FHE, ebool, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract ConfidentialStaking is IERC7984Receiver, ZamaEthereumConfig {
    address public immutable meth;
    address public immutable mzama;

    mapping(address token => mapping(address staker => euint64)) private _staked;

    event Staked(address indexed token, address indexed staker, euint64 amount, euint64 newBalance);
    event Unstaked(address indexed token, address indexed staker, euint64 amount, euint64 newBalance);

    error UnsupportedToken(address token);

    constructor(address meth_, address mzama_) {
        require(meth_ != address(0) && mzama_ != address(0), "Token address required");
        meth = meth_;
        mzama = mzama_;
    }

    function isSupportedToken(address token) public view returns (bool) {
        return token == meth || token == mzama;
    }

    function confidentialStakedBalance(address token, address staker) external view returns (euint64) {
        return _staked[token][staker];
    }

    function onConfidentialTransferReceived(
        address,
        address from,
        euint64 amount,
        bytes calldata
    ) external override returns (ebool) {
        if (!isSupportedToken(msg.sender)) {
            return FHE.asEbool(false);
        }

        euint64 current = _staked[msg.sender][from];
        (ebool success, euint64 updated) = FHESafeMath.tryIncrease(current, amount);

        _staked[msg.sender][from] = updated;
        FHE.allowThis(updated);
        FHE.allow(updated, from);

        emit Staked(msg.sender, from, amount, updated);
        return success;
    }

    function withdraw(
        address token,
        externalEuint64 amount,
        bytes calldata inputProof
    ) external returns (euint64 transferred) {
        if (!isSupportedToken(token)) {
            revert UnsupportedToken(token);
        }

        euint64 requested = FHE.fromExternal(amount, inputProof);
        euint64 current = _staked[token][msg.sender];
        (ebool success, euint64 updated) = FHESafeMath.tryDecrease(current, requested);

        _staked[token][msg.sender] = updated;
        FHE.allowThis(updated);
        FHE.allow(updated, msg.sender);

        euint64 withdrawAmount = FHE.select(success, requested, FHE.asEuint64(0));
        FHE.allowThis(withdrawAmount);

        transferred = IERC7984(token).confidentialTransfer(msg.sender, withdrawAmount);
        emit Unstaked(token, msg.sender, transferred, updated);
    }
}
