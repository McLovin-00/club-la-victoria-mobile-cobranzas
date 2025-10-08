/*
  Warnings:

  - A unique constraint covering the columns `[empresa_id,driver_dni_norm,truck_plate_norm,trailer_plate_norm,valid_from]` on the table `equipo` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "equipo_empresa_id_driver_dni_norm_truck_plate_norm_trailer__key" ON "equipo"("empresa_id", "driver_dni_norm", "truck_plate_norm", "trailer_plate_norm", "valid_from");
