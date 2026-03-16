//! Storage layer using RocksDB

use taonet_runtime::{
    types::*,
    state::L2State,
    task::Task,
};
use taonet_consensus::block::Block;
use rocksdb::{DB, Options, ColumnFamilyDescriptor};
use std::path::Path;
use std::sync::Arc;

/// Column families for different data types
const CF_BLOCKS: &str = "blocks";
const CF_TRANSACTIONS: &str = "transactions";
const CF_STATE: &str = "state";
const CF_TASKS: &str = "tasks";
const CF_MINERS: &str = "miners";
const CF_PROOFS: &str = "proofs";

/// Storage layer
pub struct Storage {
    db: Arc<DB>,
}

impl Storage {
    /// Open or create storage
    pub fn open(path: &str, cache_size_mb: usize) -> anyhow::Result<Self> {
        let path = Path::new(path);
        std::fs::create_dir_all(path)?;

        let mut opts = Options::default();
        opts.create_if_missing(true);
        opts.create_missing_column_families(true);
        opts.set_max_open_files(256);
        opts.set_write_buffer_size(cache_size_mb * 1024 * 1024 / 4);

        let cfs = vec![
            ColumnFamilyDescriptor::new(CF_BLOCKS, Options::default()),
            ColumnFamilyDescriptor::new(CF_TRANSACTIONS, Options::default()),
            ColumnFamilyDescriptor::new(CF_STATE, Options::default()),
            ColumnFamilyDescriptor::new(CF_TASKS, Options::default()),
            ColumnFamilyDescriptor::new(CF_MINERS, Options::default()),
            ColumnFamilyDescriptor::new(CF_PROOFS, Options::default()),
        ];

        let db = DB::open_cf_descriptors(&opts, path, cfs)?;

        Ok(Self { db: Arc::new(db) })
    }

    /// Store block
    pub fn put_block(&self, block: &Block) -> anyhow::Result<()> {
        let cf = self.db.cf_handle(CF_BLOCKS).unwrap();
        let key = block.header.height.to_be_bytes();
        let value = serde_json::to_vec(block)?;
        self.db.put_cf(cf, key, value)?;
        Ok(())
    }

    /// Get block by height
    pub fn get_block(&self, height: BlockHeight) -> anyhow::Result<Option<Block>> {
        let cf = self.db.cf_handle(CF_BLOCKS).unwrap();
        let key = height.to_be_bytes();
        
        if let Some(value) = self.db.get_cf(cf, key)? {
            let block: Block = serde_json::from_slice(&value)?;
            Ok(Some(block))
        } else {
            Ok(None)
        }
    }

    /// Get latest block height
    pub fn get_latest_height(&self) -> anyhow::Result<BlockHeight> {
        let cf = self.db.cf_handle(CF_BLOCKS).unwrap();
        let iter = self.db.iterator_cf(cf, rocksdb::IteratorMode::End);
        
        for item in iter {
            let (key, _) = item?;
            let height = u64::from_be_bytes(key[..8].try_into()?);
            return Ok(height);
        }

        Ok(0)
    }

    /// Store task
    pub fn put_task(&self, task: &Task) -> anyhow::Result<()> {
        let cf = self.db.cf_handle(CF_TASKS).unwrap();
        let value = serde_json::to_vec(task)?;
        self.db.put_cf(cf, &task.id, value)?;
        Ok(())
    }

    /// Get task
    pub fn get_task(&self, id: &TaskId) -> anyhow::Result<Option<Task>> {
        let cf = self.db.cf_handle(CF_TASKS).unwrap();
        
        if let Some(value) = self.db.get_cf(cf, id)? {
            let task: Task = serde_json::from_slice(&value)?;
            Ok(Some(task))
        } else {
            Ok(None)
        }
    }

    /// Store state snapshot
    pub fn put_state(&self, height: BlockHeight, state: &L2State) -> anyhow::Result<()> {
        let cf = self.db.cf_handle(CF_STATE).unwrap();
        let key = height.to_be_bytes();
        let value = serde_json::to_vec(state)?;
        self.db.put_cf(cf, key, value)?;
        Ok(())
    }

    /// Get state at height
    pub fn get_state(&self, height: BlockHeight) -> anyhow::Result<Option<L2State>> {
        let cf = self.db.cf_handle(CF_STATE).unwrap();
        let key = height.to_be_bytes();
        
        if let Some(value) = self.db.get_cf(cf, key)? {
            let state: L2State = serde_json::from_slice(&value)?;
            Ok(Some(state))
        } else {
            Ok(None)
        }
    }

    /// Get latest state
    pub fn get_latest_state(&self) -> anyhow::Result<Option<L2State>> {
        let height = self.get_latest_height()?;
        self.get_state(height)
    }

    /// Compact database
    pub fn compact(&self) {
        let cfs = [CF_BLOCKS, CF_TRANSACTIONS, CF_STATE, CF_TASKS, CF_MINERS, CF_PROOFS];
        for cf_name in cfs {
            if let Some(cf) = self.db.cf_handle(cf_name) {
                self.db.compact_range_cf(cf, None::<&[u8]>, None::<&[u8]>);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_storage_blocks() {
        let dir = tempdir().unwrap();
        let storage = Storage::open(dir.path().to_str().unwrap(), 64).unwrap();

        let block = Block::new(
            1,
            [0u8; 32],
            Vec::new(),
            Vec::new(),
            [0u8; 32],
            solana_sdk::pubkey::Pubkey::new_unique(),
            1234567890000,
        );

        storage.put_block(&block).unwrap();
        let retrieved = storage.get_block(1).unwrap().unwrap();
        
        assert_eq!(retrieved.header.height, 1);
    }
}
