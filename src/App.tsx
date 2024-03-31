import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, useAnchorWallet, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import {
    GlowWalletAdapter,
    PhantomWalletAdapter,
    SlopeWalletAdapter,
    SolflareWalletAdapter,
    TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { Program, AnchorProvider, web3, BN } from '@project-serum/anchor';
import {
    clusterApiUrl,
    Connection,
    PublicKey,
    SystemProgram,
    Transaction,
    TransactionInstruction,
} from '@solana/web3.js';
import React, { FC, ReactNode, useMemo, useState } from 'react';
import * as buffer from 'buffer';

(window as any).Buffer = buffer.Buffer;
// console.log(idl);

require('./App.css');
require('@solana/wallet-adapter-react-ui/styles.css');

const HomeCopy = () => {
    return (
        <Context>
            <Content />
        </Context>
    );
};
export default HomeCopy;

const Context: FC<{ children: ReactNode }> = ({ children }) => {
    // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
    const network = WalletAdapterNetwork.Mainnet;

    // You can also provide a custom RPC endpoint.
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);

    // @solana/wallet-adapter-wallets includes all the adapters but supports tree shaking and lazy loading --
    // Only the wallets you configure here will be compiled into your application, and only the dependencies
    // of wallets that your users connect to will be loaded.
    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new GlowWalletAdapter(),
            new SlopeWalletAdapter(),
            new SolflareWalletAdapter({ network }),
            new TorusWalletAdapter(),
        ],
        [network]
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};

const Content: FC = () => {
    const [toAddress, setToAddress] = useState<any>();
    const [memoText, setMemoText] = useState<any>();
    const clusterAPI: any = 'https://solana-mainnet.g.alchemy.com/v2/w7zDF5_9xIudjHG9L5rI502O9JbyK8TK';
    const wallet: any = useAnchorWallet();
    const lamportsToSend = 0.001 * Math.pow(10, 9);
    function getProvider() {
        if (!wallet) {
            return null;
        }

        // const network = "http://127.0.0.1:8899";
        const connection = new Connection(web3.clusterApiUrl(clusterAPI), 'confirmed');

        const provider = new AnchorProvider(connection, wallet, {
            preflightCommitment: 'confirmed',
        });

        return provider;
    }

    async function sendMemo() {
        if (!wallet) {
            return null;
        }
        console.log('Sending Memo');

        const provider = getProvider(); // see "Detecting the Provider"
        if (!provider) {
            return null;
        }
        const connection = new Connection(web3.clusterApiUrl(clusterAPI), 'confirmed');
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: wallet.publicKey,
                toPubkey: new PublicKey(toAddress),
                lamports: lamportsToSend,
            })
        );
        let hash = await connection.getLatestBlockhash();
        transaction.recentBlockhash = hash.blockhash;
        transaction.feePayer = wallet.publicKey;

        transaction.add(
            new TransactionInstruction({
                keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: true }],
                data: Buffer.from(memoText, 'utf-8'),
                programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
            })
        );

        // await sendAndConfirmTransaction(connection, transaction, [])
        const signature = await wallet.signTransaction(transaction);
        console.log('signature', signature);
        // let resp = await provider.sendAndConfirm(signature);
        const serializedTransaction = signature.serialize({ requireAllSignatures: false });
        const base64Transaction = serializedTransaction.toString('base64');
        let resp = await connection.sendEncodedTransaction(base64Transaction);
        console.log('signature resp', resp);
        // const signature = await connection.sendTransaction(transaction, signers: []);

        // await connection.getSignatureStatus(signature);
    }

    return (
        <div className="App" style={{ padding: 50 }}>
            <WalletMultiButton />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <input
                    className="ipt-box"
                    placeholder="Enter To Address"
                    onChange={(e) => setToAddress(e.target.value)}
                />
                <input
                    className="ipt-box"
                    placeholder="Enter memo text"
                    onChange={(e) => setMemoText(e.target.value)}
                />
            </div>
            <button onClick={sendMemo} className="send-btn">
                Send 0.001 SOL
            </button>
        </div>
    );
};
