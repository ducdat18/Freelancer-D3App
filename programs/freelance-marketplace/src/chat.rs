use anchor_lang::prelude::*;

/// Chat message account - stores individual messages on-chain
#[account]
pub struct ChatMessage {
    /// Sender's wallet address
    pub sender: Pubkey,
    /// Recipient's wallet address
    pub recipient: Pubkey,
    /// Encrypted message content (max 280 chars like Twitter)
    pub content: String,
    /// Unix timestamp when message was sent
    pub timestamp: i64,
    /// Whether message has been read
    pub read: bool,
    /// Message ID (unique per conversation)
    pub message_id: u64,
    /// Bump seed for PDA
    pub bump: u8,
}

impl ChatMessage {
    /// Calculate space needed for account
    /// 8 (discriminator) + 32 (sender) + 32 (recipient) + 4 + 280 (content)
    /// + 8 (timestamp) + 1 (read) + 8 (message_id) + 1 (bump)
    pub const SPACE: usize = 8 + 32 + 32 + 4 + 280 + 8 + 1 + 8 + 1;
}

/// Send a message to another user
#[derive(Accounts)]
#[instruction(recipient: Pubkey, message_id: u64)]
pub struct SendMessage<'info> {
    #[account(
        init,
        payer = sender,
        space = ChatMessage::SPACE,
        seeds = [
            b"chat_message",
            sender.key().as_ref(),
            recipient.as_ref(),
            &message_id.to_le_bytes()
        ],
        bump
    )]
    pub message: Account<'info, ChatMessage>,

    #[account(mut)]
    pub sender: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Mark a message as read
#[derive(Accounts)]
pub struct MarkMessageRead<'info> {
    #[account(
        mut,
        constraint = message.recipient == recipient.key() @ ChatError::NotRecipient
    )]
    pub message: Account<'info, ChatMessage>,

    pub recipient: Signer<'info>,
}

/// Chat events
#[event]
pub struct MessageSent {
    pub sender: Pubkey,
    pub recipient: Pubkey,
    pub message_id: u64,
    pub timestamp: i64,
}

#[event]
pub struct MessageRead {
    pub message: Pubkey,
    pub reader: Pubkey,
    pub timestamp: i64,
}

/// Chat errors
#[error_code]
pub enum ChatError {
    #[msg("Message content too long (max 280 characters)")]
    ContentTooLong,

    #[msg("Cannot send message to yourself")]
    CannotMessageSelf,

    #[msg("Only recipient can mark message as read")]
    NotRecipient,

    #[msg("Invalid recipient address")]
    InvalidRecipient,
}
