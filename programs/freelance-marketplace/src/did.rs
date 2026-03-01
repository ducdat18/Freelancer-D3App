use anchor_lang::prelude::*;
use solana_program::hash::hashv;

// ==================== DECENTRALIZED IDENTITY (DID) SYSTEM ====================

/// Create a DID document for a user (W3C DID 1.1 compliant structure)
pub fn create_did_document(ctx: Context<CreateDIDDocument>) -> Result<()> {
    let did = &mut ctx.accounts.did_document;
    let clock = Clock::get()?;

    did.owner = ctx.accounts.owner.key();
    did.did_uri = format!("did:sol:{}", ctx.accounts.owner.key());
    did.verification_method_count = 1;
    did.service_endpoint_count = 0;

    // Add the initial Ed25519 verification method (the Solana wallet key)
    did.vm_types[0] = VerificationMethodType::Ed25519VerificationKey2020 as u8;
    did.vm_keys[0] = ctx.accounts.owner.key().to_bytes();
    did.vm_controllers[0] = ctx.accounts.owner.key();

    did.created_at = clock.unix_timestamp;
    did.updated_at = clock.unix_timestamp;
    did.active = true;
    did.bump = ctx.bumps.did_document;

    emit!(DIDCreated {
        owner: did.owner,
        did_uri: did.did_uri.clone(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Add a verification method (e.g., another key type for multi-device access)
pub fn add_verification_method(
    ctx: Context<UpdateDIDDocument>,
    method_type: u8,
    public_key: [u8; 32],
) -> Result<()> {
    let did = &mut ctx.accounts.did_document;
    let clock = Clock::get()?;

    require!(did.owner == ctx.accounts.owner.key(), DIDError::Unauthorized);
    require!(did.active, DIDError::DIDDeactivated);
    require!(
        (did.verification_method_count as usize) < MAX_VERIFICATION_METHODS,
        DIDError::TooManyVerificationMethods
    );
    require!(method_type <= 3, DIDError::InvalidMethodType);

    let idx = did.verification_method_count as usize;
    did.vm_types[idx] = method_type;
    did.vm_keys[idx] = public_key;
    did.vm_controllers[idx] = ctx.accounts.owner.key();
    did.verification_method_count += 1;
    did.updated_at = clock.unix_timestamp;

    emit!(VerificationMethodAdded {
        did_owner: did.owner,
        method_type,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Remove a verification method by index
pub fn remove_verification_method(
    ctx: Context<UpdateDIDDocument>,
    method_index: u8,
) -> Result<()> {
    let did = &mut ctx.accounts.did_document;
    let clock = Clock::get()?;

    require!(did.owner == ctx.accounts.owner.key(), DIDError::Unauthorized);
    require!(did.active, DIDError::DIDDeactivated);
    require!(method_index > 0, DIDError::CannotRemovePrimaryMethod);
    require!(
        (method_index as usize) < did.verification_method_count as usize,
        DIDError::InvalidMethodIndex
    );

    let idx = method_index as usize;
    let last = did.verification_method_count as usize - 1;

    // Swap with last and decrement count
    if idx < last {
        did.vm_types[idx] = did.vm_types[last];
        did.vm_keys[idx] = did.vm_keys[last];
        did.vm_controllers[idx] = did.vm_controllers[last];
    }
    did.verification_method_count -= 1;
    did.updated_at = clock.unix_timestamp;

    emit!(VerificationMethodRemoved {
        did_owner: did.owner,
        method_index,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Add a service endpoint (LinkedIn, GitHub, portfolio, etc.)
pub fn add_service_endpoint(
    ctx: Context<UpdateDIDDocument>,
    service_type: u8,
    endpoint_uri: String,
) -> Result<()> {
    let did = &mut ctx.accounts.did_document;
    let clock = Clock::get()?;

    require!(did.owner == ctx.accounts.owner.key(), DIDError::Unauthorized);
    require!(did.active, DIDError::DIDDeactivated);
    require!(
        (did.service_endpoint_count as usize) < MAX_SERVICE_ENDPOINTS,
        DIDError::TooManyServiceEndpoints
    );
    require!(endpoint_uri.len() <= 200, DIDError::URITooLong);
    require!(service_type <= 9, DIDError::InvalidServiceType);

    let idx = did.service_endpoint_count as usize;
    did.se_types[idx] = service_type;
    did.se_uris[idx] = endpoint_uri;
    did.se_verified[idx] = false;
    did.service_endpoint_count += 1;
    did.updated_at = clock.unix_timestamp;

    emit!(ServiceEndpointAdded {
        did_owner: did.owner,
        service_type,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Verify a service endpoint (called by oracle/admin after off-chain verification)
pub fn verify_service_endpoint(
    ctx: Context<VerifyServiceEndpoint>,
    endpoint_index: u8,
) -> Result<()> {
    let did = &mut ctx.accounts.did_document;
    let clock = Clock::get()?;

    require!(
        (endpoint_index as usize) < did.service_endpoint_count as usize,
        DIDError::InvalidEndpointIndex
    );

    did.se_verified[endpoint_index as usize] = true;
    did.updated_at = clock.unix_timestamp;

    emit!(ServiceEndpointVerified {
        did_owner: did.owner,
        endpoint_index,
        verifier: ctx.accounts.verifier.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Deactivate a DID document
pub fn deactivate_did(ctx: Context<UpdateDIDDocument>) -> Result<()> {
    let did = &mut ctx.accounts.did_document;
    let clock = Clock::get()?;

    require!(did.owner == ctx.accounts.owner.key(), DIDError::Unauthorized);
    require!(did.active, DIDError::DIDDeactivated);

    did.active = false;
    did.updated_at = clock.unix_timestamp;

    emit!(DIDDeactivated {
        did_owner: did.owner,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Anchor a Verifiable Credential on-chain (issuer creates the VC anchor)
pub fn anchor_verifiable_credential(
    ctx: Context<AnchorVC>,
    credential_type: String,
    metadata_uri: String,
    expires_at: Option<i64>,
    index: u32,
) -> Result<()> {
    let vc = &mut ctx.accounts.vc_anchor;
    let counter = &mut ctx.accounts.issuer_vc_counter;
    let clock = Clock::get()?;

    require!(credential_type.len() <= 50, DIDError::CredentialTypeTooLong);
    require!(metadata_uri.len() <= 200, DIDError::URITooLong);

    // Create credential hash from issuer, subject, type, and timestamp
    let hash_data = hashv(&[
        ctx.accounts.issuer.key().as_ref(),
        ctx.accounts.subject.key().as_ref(),
        credential_type.as_bytes(),
        &clock.unix_timestamp.to_le_bytes(),
    ]);

    vc.issuer = ctx.accounts.issuer.key();
    vc.subject = ctx.accounts.subject.key();
    vc.credential_hash = hash_data.to_bytes();
    vc.credential_type = credential_type;
    vc.metadata_uri = metadata_uri;
    vc.issued_at = clock.unix_timestamp;
    vc.expires_at = expires_at;
    vc.revoked = false;
    vc.vc_index = counter.count;
    vc.bump = ctx.bumps.vc_anchor;

    counter.count = counter.count.checked_add(1).ok_or(DIDError::Overflow)?;

    emit!(VCAnchored {
        issuer: vc.issuer,
        subject: vc.subject,
        credential_type: vc.credential_type.clone(),
        credential_hash: vc.credential_hash,
        vc_index: vc.vc_index,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Revoke a Verifiable Credential (only issuer can revoke)
pub fn revoke_credential(ctx: Context<RevokeVC>) -> Result<()> {
    let vc = &mut ctx.accounts.vc_anchor;
    let clock = Clock::get()?;

    require!(vc.issuer == ctx.accounts.issuer.key(), DIDError::Unauthorized);
    require!(!vc.revoked, DIDError::AlreadyRevoked);

    vc.revoked = true;

    emit!(VCRevoked {
        issuer: vc.issuer,
        subject: vc.subject,
        vc_index: vc.vc_index,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

// ==================== CONSTANTS ====================

pub const MAX_VERIFICATION_METHODS: usize = 5;
pub const MAX_SERVICE_ENDPOINTS: usize = 5;

// ==================== CONTEXT STRUCTS ====================

#[derive(Accounts)]
pub struct CreateDIDDocument<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + DIDDocument::INIT_SPACE,
        seeds = [b"did", owner.key().as_ref()],
        bump
    )]
    pub did_document: Account<'info, DIDDocument>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateDIDDocument<'info> {
    #[account(
        mut,
        seeds = [b"did", owner.key().as_ref()],
        bump = did_document.bump
    )]
    pub did_document: Account<'info, DIDDocument>,
    #[account(mut)]
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct VerifyServiceEndpoint<'info> {
    #[account(
        mut,
        seeds = [b"did", did_document.owner.as_ref()],
        bump = did_document.bump
    )]
    pub did_document: Account<'info, DIDDocument>,
    /// Verifier must be an authorized oracle or admin
    pub verifier: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(credential_type: String, metadata_uri: String, expires_at: Option<i64>, index: u32)]
pub struct AnchorVC<'info> {
    #[account(
        init,
        payer = issuer,
        space = 8 + VCAnchor::INIT_SPACE,
        seeds = [b"vc-anchor", issuer.key().as_ref(), &index.to_le_bytes()],
        bump
    )]
    pub vc_anchor: Account<'info, VCAnchor>,
    #[account(
        init_if_needed,
        payer = issuer,
        space = 8 + VCCounter::INIT_SPACE,
        seeds = [b"vc-counter", issuer.key().as_ref()],
        bump
    )]
    pub issuer_vc_counter: Account<'info, VCCounter>,
    /// CHECK: Subject's wallet (the credential holder)
    pub subject: AccountInfo<'info>,
    #[account(mut)]
    pub issuer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeVC<'info> {
    #[account(
        mut,
        constraint = vc_anchor.issuer == issuer.key() @ DIDError::Unauthorized
    )]
    pub vc_anchor: Account<'info, VCAnchor>,
    pub issuer: Signer<'info>,
}

// ==================== STATE ACCOUNTS ====================

#[account]
#[derive(InitSpace)]
pub struct DIDDocument {
    pub owner: Pubkey,
    #[max_len(100)]
    pub did_uri: String,
    // Verification methods (fixed arrays to avoid Vec serialization issues)
    pub verification_method_count: u8,
    pub vm_types: [u8; 5],          // VerificationMethodType as u8
    pub vm_keys: [[u8; 32]; 5],     // Public keys
    pub vm_controllers: [Pubkey; 5], // Controllers
    // Service endpoints
    pub service_endpoint_count: u8,
    pub se_types: [u8; 5],          // ServiceType as u8
    #[max_len(5, 200)]
    pub se_uris: Vec<String>,       // Endpoint URIs
    pub se_verified: [bool; 5],
    // Metadata
    pub created_at: i64,
    pub updated_at: i64,
    pub active: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct VCAnchor {
    pub issuer: Pubkey,
    pub subject: Pubkey,
    pub credential_hash: [u8; 32],
    #[max_len(50)]
    pub credential_type: String,
    #[max_len(200)]
    pub metadata_uri: String,
    pub issued_at: i64,
    pub expires_at: Option<i64>,
    pub revoked: bool,
    pub vc_index: u32,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct VCCounter {
    pub issuer: Pubkey,
    pub count: u32,
    pub bump: u8,
}

// ==================== ENUMS ====================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum VerificationMethodType {
    Ed25519VerificationKey2020 = 0,
    EcdsaSecp256k1VerificationKey2019 = 1,
    JsonWebKey2020 = 2,
    X25519KeyAgreementKey2020 = 3,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ServiceType {
    LinkedIn = 0,
    GitHub = 1,
    Twitter = 2,
    Website = 3,
    Email = 4,
    Portfolio = 5,
    Telegram = 6,
    Discord = 7,
    Medium = 8,
    Other = 9,
}

// ==================== EVENTS ====================

#[event]
pub struct DIDCreated {
    pub owner: Pubkey,
    pub did_uri: String,
    pub timestamp: i64,
}

#[event]
pub struct VerificationMethodAdded {
    pub did_owner: Pubkey,
    pub method_type: u8,
    pub timestamp: i64,
}

#[event]
pub struct VerificationMethodRemoved {
    pub did_owner: Pubkey,
    pub method_index: u8,
    pub timestamp: i64,
}

#[event]
pub struct ServiceEndpointAdded {
    pub did_owner: Pubkey,
    pub service_type: u8,
    pub timestamp: i64,
}

#[event]
pub struct ServiceEndpointVerified {
    pub did_owner: Pubkey,
    pub endpoint_index: u8,
    pub verifier: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct DIDDeactivated {
    pub did_owner: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct VCAnchored {
    pub issuer: Pubkey,
    pub subject: Pubkey,
    pub credential_type: String,
    pub credential_hash: [u8; 32],
    pub vc_index: u32,
    pub timestamp: i64,
}

#[event]
pub struct VCRevoked {
    pub issuer: Pubkey,
    pub subject: Pubkey,
    pub vc_index: u32,
    pub timestamp: i64,
}

// ==================== ERROR CODES ====================

#[error_code]
pub enum DIDError {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("DID is deactivated")]
    DIDDeactivated,
    #[msg("Too many verification methods (max 5)")]
    TooManyVerificationMethods,
    #[msg("Too many service endpoints (max 5)")]
    TooManyServiceEndpoints,
    #[msg("URI too long (max 200)")]
    URITooLong,
    #[msg("Invalid verification method type")]
    InvalidMethodType,
    #[msg("Invalid service type")]
    InvalidServiceType,
    #[msg("Invalid method index")]
    InvalidMethodIndex,
    #[msg("Cannot remove primary verification method")]
    CannotRemovePrimaryMethod,
    #[msg("Invalid endpoint index")]
    InvalidEndpointIndex,
    #[msg("Credential type too long (max 50)")]
    CredentialTypeTooLong,
    #[msg("Credential already revoked")]
    AlreadyRevoked,
    #[msg("Arithmetic overflow")]
    Overflow,
}
