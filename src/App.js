import React, { useEffect, useState } from "react";
import "./App.css";
/* ethers 変数を使えるようにする*/
import { ethers } from "ethers";
/* ABIファイルを含むWavePortal.jsonファイルをインポートする*/
import abi from "./utils/WavePortal.json";

const App = () => {
  /* ユーザーのパブリックウォレットを保存するために使用する状態変数を定義 */
  const [currentAccount, setCurrentAccount] = useState("");

  /* ユーザーのメッセージを保存するために使用する状態変数を定義 */
  const [messageValue, setMessageValue] = useState("");

  /* すべてのwavesを保存する状態変数を定義 */
  const [allWaves, setAllWaves] = useState([]);

  console.log("currentAccount: ", currentAccount);

  /* デプロイされたコントラクトのアドレスを保持する変数を作成 */
  const contractAddress = "0xb21aDCa954fB1645e525B905Cf0c3fdDE0bbe99E";

  /* コントラクトからすべてのwavesを取得するメソッドを作成 */
  /* ABIの内容を参照する変数を作成 */
  const contractABI = abi.abi;

  const getAllWaves = async () => {
    const { ethereum } = window;

    try {
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const wavePortalContract = new ethers.Contract(
          contractAddress,
          contractABI,
          signer
        );
        /* コントラクトからgetAllWavesメソッドを呼び出す */
        const waves = await wavePortalContract.getAllWaves();
        /* UIに必要なのは、アドレス、タイムスタンプ、メッセージだけなので、以下のように設定 */
        const wavesCleaned = waves.map((wave) => {
          return {
            address: wave.waver,
            timestamp: new Date(wave.timestamp * 1000),
            message: wave.message,
          };
        });
        /* React Stateにデータを格納する */
        setAllWaves(wavesCleaned);
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error);
    }
  };

  /**
   * `emit`されたイベントをフロントエンドに反映させる
   */
  useEffect(() => {
    let wavePortalContract;

    const onNewWave = (from, timestamp, message) => {
      console.log("NewWave", from, timestamp, message);
      setAllWaves((prevState) => [
        ...prevState,
        {
          address: from,
          timestamp: new Date(timestamp * 1000),
          message: message,
        },
      ]);
    };
    
    /* NewWaveイベントがコントラクトから発信されたときに、情報をを受け取ります */
    if (window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      wavePortalContract = new ethers.Contract(
        contractAddress,
        contractABI,
        signer
      );
      wavePortalContract.on("NewWave", onNewWave);
    }
    /*メモリリークを防ぐために、NewWaveのイベントを解除します*/
    return () => {
      if (wavePortalContract) {
        wavePortalContract.off("NewWave", onNewWave);
      }
    };
  }, []);

  /* window.ethereumにアクセスできることを確認する関数を実装 */
  const checkIfWalletIsConnected = async () => {
    try {
      const { ethereum } = window;
      if (!ethereum) {
        console.log("Make sure you have MetaMask!");
        return;
      } else {
        console.log("We have the ethereum object", ethereum);
      }
      /* ユーザーのウォレットへのアクセスが許可されているかどうかを確認 */
      const accounts = await ethereum.request({ method: "eth_accounts" });
      if (accounts.length !== 0) {
        const account = accounts[0];
        console.log("Found an authorized account:", account);
        setCurrentAccount(account);
        getAllWaves();
      } else {
        console.log("No authorized account found");
      }
    } catch (error) {
      console.log(error);
    }
  };
  /* connectWalletメソッドを実装 */
  const connectWallet = async () => {
    try {
      const { ethereum } = window;
      if (!ethereum) {
        alert("Get MetaMask!");
        return;
      }
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });
      console.log("Connected: ", accounts[0]);
      setCurrentAccount(accounts[0]);
    } catch (error) {
      console.log(error);
    }
  };
  /* waveの回数をカウントする関数を実装 */
  const wave = async () => {
    try {
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        /* ABIを参照 */
        const wavePortalContract = new ethers.Contract(
          contractAddress,
          contractABI,
          signer
        );
        let count = await wavePortalContract.getTotalWaves();
        console.log("Retrieved total wave count...", count.toNumber());

        /* コントラクトの残高を取得して出力 */
        let contractBalance = await provider.getBalance(wavePortalContract.address);
        console.log("Contract balance:", ethers.utils.formatEther(contractBalance));

        /* コントラクトに👋（wave）を書き込む */
        const waveTxn = await wavePortalContract.wave(messageValue, {
          gasLimit: 300000,
        });
        console.log("Mining...", waveTxn.hash);
        await waveTxn.wait();
        console.log("Mined -- ", waveTxn.hash);
        count = await wavePortalContract.getTotalWaves();
        console.log("Retrieved total wave count...", count.toNumber());

        let contractBalance_post = await provider.getBalance(
          wavePortalContract.address
        );
        /* コントラクトの残高が減っていることを確認 */
        if (contractBalance_post < contractBalance) {
          /* 減っていたら下記を出力 */
          console.log("User won ETH!");
        } else {
          console.log("User didn't win ETH.");
        }
        console.log(
          "Contract balance after wave:",
          ethers.utils.formatEther(contractBalance_post)
        );
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error);
    }
  };

  /* WEBページがロードされたときにcheckIfWalletIsConnected()を実行 */
  useEffect(() => {
    checkIfWalletIsConnected();
  }, []);

  return (
    <div className="mainContainer">
      <div className="bg"></div>
      <div className="content">
        {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
        <a
          type="button"
          className="wallet-connect-btn"
          onClick={currentAccount ? undefined : connectWallet }
        >
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          { currentAccount ? 'WALLET CONNECTED' : 'CONNECT WALLET' }
        </a>

        <h1>Bad Vibes Only</h1>

        <img
          className="finger"
          src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/62921/middle-finger-emoji.png"
          alt="fuck"
          onClick={wave}
        />

        {currentAccount && (
          <div className="msg-wrapper">
            <input
              name="messageArea"
              placeholder="In a bad world, bad is good. If you get the moral polarity of it."
              type="text"
              id="message"
              value={messageValue}
              onChange={(e) => setMessageValue(e.target.value)}
            />
            <span className="underline"></span>
          </div>
        )}

        {
          currentAccount && <div className="history">
            <h2>History</h2>
            {
              allWaves
                .slice(0)
                .reverse()
                .map((fuck, index) => {
                  return (
                    <div
                      key={index}
                      style={{
                        marginTop: "16px",
                        padding: "8px",
                      }}
                    >
                      <div>Address: {fuck.address}</div>
                      <div>Time: {fuck.timestamp.toString()}</div>
                      <div>Message: {fuck.message}</div>
                    </div>
                  );
                })}
          </div>
        }
      </div>
    </div>
  );
};
export default App;