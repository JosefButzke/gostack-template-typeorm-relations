import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateProductService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) { }

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);
    if (!customer) {
      throw new AppError('Customer not exist');
    }

    const productsInfo = await this.productsRepository.findAllById(products);

    if (productsInfo.length !== products.length) {
      throw new AppError('Inavalid product');
    }

    const productsToOrder = productsInfo.map(productInfo => {
      const productToOrder = products.find(
        productFind => productFind.id === productInfo.id,
      );

      if (productToOrder) {
        if (productInfo.quantity < productToOrder.quantity) {
          throw new AppError('Quantity invalid');
        }
      }
      return {
        product_id: productInfo.id,
        price: productInfo.price,
        quantity: productToOrder?.quantity || 0,
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: productsToOrder,
    });
    await this.productsRepository.updateQuantity(products);
    return order;
  }
}

export default CreateProductService;
