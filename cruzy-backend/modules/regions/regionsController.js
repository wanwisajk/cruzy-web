const { fetchTable, supabase } = require('../../shared/db');
const { parseInteger, required, sendError } = require('../../shared/http');
const TABLES = require('../../shared/tables');

exports.listRegions = async (_req, res) => {
  try {
    res.json(await fetchTable(TABLES.regions));
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงข้อมูลภูมิภาคได้');
  }
};

exports.getRegions = exports.listRegions;

exports.getRegion = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const { data, error } = await supabase.from(TABLES.regions).select('*').eq('id', id).single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    sendError(res, error, 'ไม่สามารถดึงข้อมูลภูมิภาคได้');
  }
};

exports.createRegion = async (req, res) => {
  try {
    if (!required(res, req.body, ['name'])) return;
    const { data, error } = await supabase.from(TABLES.regions).insert([{ name: req.body.name }]).select().single();
    if (error) throw error;
    res.status(201).json({ message: 'เพิ่มภูมิภาคสำเร็จ', data });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถเพิ่มภูมิภาคได้');
  }
};

exports.updateRegion = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const { data, error } = await supabase.from(TABLES.regions).update({ name: req.body.name }).eq('id', id).select().single();
    if (error) throw error;
    res.json({ message: 'อัปเดตภูมิภาคสำเร็จ', data });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถอัปเดตภูมิภาคได้');
  }
};

exports.deleteRegion = async (req, res) => {
  try {
    const id = parseInteger(req.params.id);
    if (id === null) return res.status(400).json({ message: 'id ต้องเป็นตัวเลข' });
    const { error } = await supabase.from(TABLES.regions).delete().eq('id', id);
    if (error) throw error;
    res.json({ message: 'ลบภูมิภาคสำเร็จ' });
  } catch (error) {
    sendError(res, error, 'ไม่สามารถลบภูมิภาคได้');
  }
};
