export const validateEquipment = (values) => {
  const errors = {};

  if (!values.equipment_id) {
    errors.equipment_id = "กรุณากรอกรหัสครุภัณฑ์";
  } else if (!/^[A-Z0-9-]{4,}$/i.test(values.equipment_id)) {
    errors.equipment_id = "รหัสครุภัณฑ์ไม่ถูกต้อง";
  }

  if (!values.name?.trim()) {
    errors.name = "กรุณากรอกชื่อ";
  }

  if (!values.type) {
    errors.type = "กรุณาเลือกประเภท";
  }

  if (!values.room?.trim()) {
    errors.room = "กรุณากรอกห้อง";
  }

  return errors;
};
