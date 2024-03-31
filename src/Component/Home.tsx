import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider, useAnchorWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { Program, AnchorProvider, web3, BN } from '@project-serum/anchor';
import { clusterApiUrl, Connection } from '@solana/web3.js';
import React, { FC, ReactNode, useMemo, useState } from 'react';
import idl from '../services/idl.json';
import config from '../config';


// test
import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import * as buffer from "buffer";
import { Buffer } from 'buffer/';

(window as any).Buffer = buffer.Buffer;


const Home: FC = () => {
    return (
        <Context>
            <Content />
        </Context>
    );
};
export default Home;

const Context: FC<{ children: ReactNode }> = ({ children }) => {
    const network = WalletAdapterNetwork.Devnet;

    const endpoint = useMemo(() => clusterApiUrl(network), [network]);

    const wallets = useMemo(() => [new PhantomWalletAdapter()], [network]);

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};

const Content: FC = () => {
    const [isEligibleClaim, setIsEligibleClaim] = useState(false);
    const [showEligibleCTA, setShowEligibleCTA] = useState(true);

    const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID: PublicKey = new PublicKey(
        config.ATokenProgram
    );

    let user_index: number;
    const wallet = useAnchorWallet();
    console.log('wallet', wallet);
    const baseAccount = web3.Keypair.generate();

    function getProvider() {
        if (!wallet) {
            return null;
        }

        const connection = new Connection(web3.clusterApiUrl('devnet'), 'confirmed');
        const provider = new AnchorProvider(connection, wallet, {
            preflightCommitment: 'confirmed',
        });

        return provider;
    }

    function getProgram() {
        const provider = getProvider();
        if (!provider) {
            return;
        }

        const prog_idl = JSON.parse(JSON.stringify(idl));
        const program = new Program(prog_idl, config.ProgramID, provider);
        return program;
    }

    async function getGlobalStats() {
        const program = getProgram();
        if (!program) {
            return;
        }

        try {
            const data: any = await program.account.global.fetch(config.GlobalAccountID);

            console.log('account: ', data);
            console.log('claimableTokens: ', data.claimableTokens.toString());
            console.log('claimedTokens: ', data.claimedTokens.toString());
            console.log('totalUsers: ', data.totalUsers.toString());
        } catch (err) {
            console.log('Transcation error: ', err);
        }
    }
    
    async function checkEligibility() {
        // let list_ata = PublicKey.findProgramAddressSync(
        //     [
        //         // user_list public key
        //         new PublicKey("ESd8AQLP9tREMMSJr4ps1DzpNB9W2eTeJQfy9nnoVTgD").toBuffer(),
        //         // splana token program id TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
        //         TOKEN_PROGRAM_ID.toBuffer(),
        //         // token mint address id
        //         new PublicKey("EbVXnyXFeZ1dYeHGBGMcdrKhmTrz48crFrj98U7rWrbe").toBuffer(),
        //     ],

        //     // solan associated token program
        //     SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
        // )[0];
        // console.log("ATA: ", list_ata.toString())

        // let user_ata = PublicKey.findProgramAddressSync(
        //     [
        //         // user_list public key
        //         new PublicKey("7tDsvpnu7afxXXLzCfUhFag1wfQbMC91z5acAZFqtZhm").toBuffer(),
        //         // splana token program id TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
        //         TOKEN_PROGRAM_ID.toBuffer(),
        //         // token mint address id
        //         new PublicKey("EbVXnyXFeZ1dYeHGBGMcdrKhmTrz48crFrj98U7rWrbe").toBuffer(),
        //     ],

        //     // solan associated token program
        //     SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
        // )[0];
        // console.log("User ATA: ", user_ata.toString())

        const vaultAccount = await PublicKey.findProgramAddress(
            [Buffer.from("list")], new PublicKey("DB8D2BUejs8UFu7PbxSf2r5ftHFfyW16gbuNZ6CgbRz6")
        );

        console.log("User PKey: ", vaultAccount)
        // console.log("User Bump: ", vaultAccount.toString())

        const program = getProgram();
        if (!program || !wallet) {
            return;
        }
        try {
            let data : any = await program.account.user.fetch(config.UserListID);
            console.log('users data: ', data);
            
            let users : Array<PublicKey> = data.user;
            let amounts : Array<BN> = data.token;
            console.log('user: ', users);
            console.log('token: ', amounts);
            let resp = users.find(ele =>  ele.toString() === wallet.publicKey.toString())

            if (resp) {
                user_index = users.indexOf(resp);
                console.log('Valid Claimer:', wallet.publicKey.toString());
                setShowEligibleCTA(false);
                setIsEligibleClaim(true);
            } else {
                console.log('Invalid Claimer: ', wallet.publicKey.toString());
            }
        } catch (err) {
            console.log('Transcation error: ', err);
        }
    }

    async function claimTokens() {
        const program = getProgram();
        if (!program || !wallet) {
            return;
        }
        try {
            const user_key = await PublicKey.findProgramAddress(
                [Buffer.from("list")], new PublicKey(config.ProgramID)
            );
            let bump = user_key[1]

            let user_ata = PublicKey.findProgramAddressSync(
                [
                    // user public key
                    wallet.publicKey.toBuffer(),
                    TOKEN_PROGRAM_ID.toBuffer(),
                    // token mint address id
                    new PublicKey(config.TokenMintID).toBuffer(),
                ],

                // solan associated token program
                SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
            )[0];
            console.log("User ATA: ", user_ata.toString())

            let result = await program.methods.claimToken(new BN(bump), new BN(user_index)).accounts({
                userList: new web3.PublicKey(config.UserListID),
                global: new web3.PublicKey(config.GlobalAccountID),
                user: wallet.publicKey,
                mint: new web3.PublicKey(config.TokenMintID),
                userAta: user_ata,
                listAta: new web3.PublicKey(config.UserListATA),
                systemProgram: new web3.PublicKey(config.SystemProgram),
                tokenProgram: new web3.PublicKey(config.TokenProgram),
                associatedTokenProgram: new web3.PublicKey(config.ATokenProgram)
            }).rpc();

            console.log('claim result: ', result);
            console.log('claim result: ', result.toString());

            // const account = await program.account.myAccount.fetch(baseAccount.publicKey);
        } catch (err) {
            console.log('Transcation error: ', err);
        }
    }

    return (
        <div>
      

        </div>
    );
};
