from onnxruntime.quantization import quantize_dynamic, QuantType

input_onnx  = "shard-models/Phi-3-mini-4k-instruct/onnx/model.onnx"
output_onnx = "shard-models/Phi-3-mini-4k-instruct/onnx/model_quantized.onnx"

quantize_dynamic(
    model_input   = input_onnx,
    model_output  = output_onnx,
    per_channel   = True,
    weight_type   = QuantType.QInt8
)
print("✅ Wrote quantized ONNX to", output_onnx)